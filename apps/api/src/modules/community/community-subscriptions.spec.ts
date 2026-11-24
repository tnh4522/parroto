import { createHmac, randomUUID } from "node:crypto";
import type { INestApplication } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { configureApp } from "../../app.bootstrap";
import { AppModule } from "../../app.module";
import { getAppEnv } from "../../core/config/env";
import { PrismaService } from "../../core/database/prisma.service";
import { ExamsService } from "../exams/exams.service";
import { processExamExpirationSweep } from "../../worker/workers";

const VERIFIED_USER_ID = randomUUID();
const UNVERIFIED_USER_ID = randomUUID();
const PLAN_ID = randomUUID();
const SHOP_ITEM_ID = randomUUID();
const TARGET_LESSON_ID = randomUUID();

interface TxRecord {
  id: string;
  userId: string;
  planId: string;
  provider: string;
  providerTxId: string;
  amountCents: number;
  currency: string;
  status: string;
  promoCodeId: string | null;
}

describe("Community, Subscriptions & Workers (/api/v1/speaking, /api/v1/billing, /api/v1/webhooks)", () => {
  let app: INestApplication;
  let jwtService: JwtService;

  const grants: Array<{ userId: string; tier: string }> = [];
  const txs = new Map<string, TxRecord>();
  const rooms: Array<Record<string, unknown>> = [];
  const comments: Array<Record<string, unknown>> = [];
  let userDiamonds = 200;

  const planProMonthly = {
    id: PLAN_ID,
    code: "PRO_1M",
    tier: "PRO" as const,
    durationDays: 30,
    amountCents: 999,
    currency: "USD",
    isActive: true,
  };

  const streakFreezeItem = {
    id: SHOP_ITEM_ID,
    name: "Streak Freeze",
    description: "Protect daily streak",
    itemType: "STREAK_FREEZE",
    price: 50,
    imageUrl: "https://cdn.example.test/freeze.png",
    rarity: "COMMON",
    isActive: true,
  };

  const delegates = {
    user: {
      findUnique: async ({ where }: { where: { id: string } }) => ({
        id: where.id,
        email: `${where.id}@example.test`,
        role: "USER",
        status: "ACTIVE",
        ageVerifiedAt: where.id === UNVERIFIED_USER_ID ? null : new Date(),
        entitlements: grants
          .filter((g) => g.userId === where.id)
          .map((g) => ({
            id: randomUUID(),
            tier: g.tier,
            revokedAt: null,
            expiresAt: null,
          })),
      }),
    },
    aiAuditLog: {
      create: async () => ({}),
    },
    comment: {
      findMany: async () => comments,
      count: async () => comments.length,
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const rec = {
          id: randomUUID(),
          ...data,
          createdAt: new Date(),
          author: { displayName: "Speaker One" },
        };
        comments.push(rec);
        return rec;
      },
    },
    speakingRoom: {
      findMany: async () => rooms,
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const rec = {
          id: randomUUID(),
          ...data,
          createdAt: new Date(),
          host: { displayName: "Speaker One" },
        };
        rooms.push(rec);
        return rec;
      },
    },
    plan: {
      findMany: async () => [planProMonthly],
      findUnique: async ({
        where,
      }: {
        where: { id?: string; code?: string };
      }) => {
        if (where.code === "PRO_1M" || where.id === PLAN_ID) {
          return planProMonthly;
        }
        return null;
      },
    },
    paymentTransaction: {
      create: async ({ data }: { data: TxRecord }) => {
        const rec: TxRecord = { ...data, id: randomUUID() };
        txs.set(rec.providerTxId, rec);
        return rec;
      },
      findUnique: async ({
        where,
      }: {
        where: { providerTxId: string };
      }) => txs.get(where.providerTxId) ?? null,
      update: async ({
        where,
        data,
      }: {
        where: { id: string };
        data: { status: string };
      }) => {
        for (const [k, v] of txs.entries()) {
          if (v.id === where.id) {
            const updated = { ...v, status: data.status };
            txs.set(k, updated);
            return updated;
          }
        }
        throw { code: "P2025" };
      },
    },
    entitlementGrant: {
      create: async ({
        data,
      }: {
        data: { userId: string; tier: string };
      }) => {
        grants.push({ userId: data.userId, tier: data.tier });
        return data;
      },
    },
    shopItem: {
      findMany: async () => [streakFreezeItem],
      findUnique: async ({ where }: { where: { id: string } }) =>
        where.id === SHOP_ITEM_ID ? streakFreezeItem : null,
    },
    userInventory: {
      findUnique: async () => null,
      create: async () => ({}),
    },
    userStats: {
      findUnique: async () => ({ diamondBalance: userDiamonds }),
      update: async ({
        data,
      }: {
        data: { diamondBalance: number };
      }) => {
        userDiamonds = data.diamondBalance;
        return { diamondBalance: userDiamonds };
      },
    },
    diamondLedger: {
      create: async () => ({}),
    },
    examSession: {
      findMany: async () => [{ id: "expired-sess-1", userId: VERIFIED_USER_ID }],
    },
  };

  const fakePrisma = {
    ...delegates,
    $transaction: async <T>(fn: (tx: typeof delegates) => Promise<T>) => fn(delegates),
  };

  beforeAll(async () => {
    process.env.NODE_ENV = "test";
    process.env.REDIS_URL = "memory";

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(fakePrisma)
      .compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    jwtService = moduleRef.get(JwtService);
  });

  beforeEach(() => {
    grants.length = 0;
    txs.clear();
    rooms.length = 0;
    comments.length = 0;
    userDiamonds = 200;
  });

  afterAll(async () => {
    await app.close();
  });

  it("enforces age-verification guard on speaking rooms and AI moderation on comments", async () => {
    const unverifiedToken = await jwtService.signAsync(
      { sub: UNVERIFIED_USER_ID, email: "young@example.test", role: "USER" },
      { secret: getAppEnv().JWT_ACCESS_SECRET }
    );
    const verifiedToken = await jwtService.signAsync(
      { sub: VERIFIED_USER_ID, email: "adult@example.test", role: "USER" },
      { secret: getAppEnv().JWT_ACCESS_SECRET }
    );

    // Unverified account blocked from creating voice speaking room (403 AGE_VERIFICATION_REQUIRED)
    const unverifiedRes = await request(app.getHttpServer())
      .post("/api/v1/speaking/rooms")
      .set("Authorization", `Bearer ${unverifiedToken}`)
      .send({
        name: "B1 Fluency Group",
        topic: "Daily Life",
        cefrLevel: "B1",
        maxParticipants: 4,
        isPrivate: false,
      })
      .expect(403);
    expect(unverifiedRes.body.code).toBe("AGE_VERIFICATION_REQUIRED");

    // Verified account creates room cleanly
    const roomRes = await request(app.getHttpServer())
      .post("/api/v1/speaking/rooms")
      .set("Authorization", `Bearer ${verifiedToken}`)
      .send({
        name: "IELTS Speaking Lounge",
        topic: "IELTS Speaking",
        cefrLevel: "B2",
        maxParticipants: 4,
        isPrivate: false,
      })
      .expect(201);
    expect(roomRes.body.room.name).toBe("IELTS Speaking Lounge");

    // AI moderation rejects flagged spam comment
    await request(app.getHttpServer())
      .post("/api/v1/comments")
      .set("Authorization", `Bearer ${verifiedToken}`)
      .send({
        targetType: "LESSON",
        targetId: TARGET_LESSON_ID,
        content: "Visit malware.example to buy cheap followers!",
      })
      .expect(400);
  });

  it("verifies HMAC webhooks to grant PRO entitlement, purchases shop items, and runs exam sweep worker", async () => {
    const token = await jwtService.signAsync(
      { sub: VERIFIED_USER_ID, email: "adult@example.test", role: "USER" },
      { secret: getAppEnv().JWT_ACCESS_SECRET }
    );

    // 1. Checkout pending transaction
    const checkoutRes = await request(app.getHttpServer())
      .post("/api/v1/billing/checkout")
      .set("Authorization", `Bearer ${token}`)
      .send({ planCode: "PRO_1M", provider: "stripe" })
      .expect(200);

    const providerTxId = checkoutRes.body.providerTxId as string;
    const webhookBody = { providerTxId, status: "PAID" };
    const webhookRaw = JSON.stringify(webhookBody);

    // Invalid signature rejected
    await request(app.getHttpServer())
      .post("/api/v1/webhooks/stripe")
      .set("x-webhook-signature", "sha256=invalid")
      .send(webhookBody)
      .expect(401);

    // Valid HMAC signature activates PRO grant idempotently
    const validSig = createHmac(
      "sha256",
      getAppEnv().BILLING_WEBHOOK_SECRET_STRIPE
    )
      .update(webhookRaw)
      .digest("hex");

    const webhookRes = await request(app.getHttpServer())
      .post("/api/v1/webhooks/stripe")
      .set("x-webhook-signature", `sha256=${validSig}`)
      .send(webhookBody)
      .expect(200);
    expect(webhookRes.body.grantedTier).toBe("PRO");

    // Idempotent duplicate replay
    const dupRes = await request(app.getHttpServer())
      .post("/api/v1/webhooks/stripe")
      .set("x-webhook-signature", `sha256=${validSig}`)
      .send(webhookBody)
      .expect(200);
    expect(dupRes.body.idempotentDuplicate).toBe(true);

    // 2. Shop atomic diamond debit
    const shopRes = await request(app.getHttpServer())
      .post("/api/v1/shop/purchase")
      .set("Authorization", `Bearer ${token}`)
      .send({ itemId: SHOP_ITEM_ID })
      .expect(200);
    expect(shopRes.body.diamondBalance).toBe(150);

    // 3. Background exam expiration sweep delegates to ExamsService.submitSession
    const submittedSessions: string[] = [];
    const fakeExamSvc = {
      submitSession: async (_uid: string, sid: string) => {
        submittedSessions.push(sid);
        return {};
      },
    } as unknown as ExamsService;

    const count = await processExamExpirationSweep(
      fakePrisma as unknown as PrismaService,
      fakeExamSvc
    );
    expect(count).toBe(1);
    expect(submittedSessions).toEqual(["expired-sess-1"]);
  });
});
