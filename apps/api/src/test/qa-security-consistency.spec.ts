import { randomUUID } from "node:crypto";
import type { INestApplication } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { configureApp } from "../app.bootstrap";
import { AppModule } from "../app.module";
import { getAppEnv } from "../core/config/env";
import { PrismaService } from "../core/database/prisma.service";

const OWNER_ID = randomUUID();
const ATTACKER_ID = randomUUID();
const BANNED_USER_ID = randomUUID();
const EXPIRED_SESSION_ID = randomUUID();
const PRIVATE_DECK_SLUG = "private-owner-deck";
const ASSESSMENT_ID = randomUUID();
const EXPENSIVE_ITEM_ID = randomUUID();

describe("QA Security, Rate Limiting & Database Consistency (/api/v1)", () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let ownerDiamonds = 20;

  const delegates = {
    user: {
      findUnique: async ({ where }: { where: { id: string } }) => {
        if (where.id === BANNED_USER_ID) {
          return {
            id: BANNED_USER_ID,
            email: "banned@example.test",
            role: "USER",
            status: "BANNED",
            ageVerifiedAt: new Date(),
            audioConsentAt: new Date(),
            entitlements: [],
          };
        }
        return {
          id: where.id,
          email: `${where.id}@example.test`,
          role: "USER",
          status: "ACTIVE",
          ageVerifiedAt: new Date(),
          audioConsentAt: new Date(),
          entitlements: [],
        };
      },
    },
    examSession: {
      findUnique: async ({ where }: { where: { id: string } }) => {
        if (where.id !== EXPIRED_SESSION_ID) return null;
        return {
          id: EXPIRED_SESSION_ID,
          userId: OWNER_ID,
          examId: randomUUID(),
          mode: "TEST",
          status: "IN_PROGRESS",
          selectedParts: [1],
          startedAt: new Date(Date.now() - 3600_000),
          deadlineAt: new Date(Date.now() - 120_000), // Expired 2 mins ago
          exam: { parts: [], examSet: { examType: { code: "IELTS" } } },
          answers: [],
        };
      },
    },
    vocabDeck: {
      findUnique: async ({ where }: { where: { slug: string } }) => {
        if (where.slug !== PRIVATE_DECK_SLUG) return null;
        return {
          id: randomUUID(),
          slug: PRIVATE_DECK_SLUG,
          title: "Secret Owner Deck",
          description: null,
          cefrLevel: "C1",
          ownerId: OWNER_ID,
          visibility: "PRIVATE",
          isPro: false,
          wordCount: 1,
          owner: { displayName: "Owner" },
          cards: [],
        };
      },
    },
    speechAssessment: {
      findUnique: async ({ where }: { where: { id: string } }) => {
        if (where.id !== ASSESSMENT_ID) return null;
        return {
          id: ASSESSMENT_ID,
          userId: OWNER_ID,
          mediaAssetId: null,
          mode: "SHADOWING",
          status: "PENDING",
          measurementTier: null,
          transcript: null,
          referenceText: null,
          resultJson: null,
          errorCode: null,
          audioDeletedAt: null,
          createdAt: new Date(),
          completedAt: null,
        };
      },
    },
    shopItem: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        where.id === EXPENSIVE_ITEM_ID
          ? {
              id: EXPENSIVE_ITEM_ID,
              name: "Golden Frame",
              description: "VIP frame",
              itemType: "AVATAR_FRAME",
              price: 500,
              imageUrl: "https://cdn.example.test/frame.png",
              rarity: "EPIC",
              isActive: true,
            }
          : null,
    },
    userInventory: {
      findUnique: async () => null,
    },
    userStats: {
      findUnique: async () => ({ diamondBalance: ownerDiamonds }),
      findMany: async () => [],
      update: async ({ data }: { data: { diamondBalance: number } }) => {
        ownerDiamonds = data.diamondBalance;
        return { diamondBalance: ownerDiamonds };
      },
    },
  };

  const fakePrisma = {
    ...delegates,
    $transaction: async <T>(fn: (tx: typeof delegates) => Promise<T>) =>
      fn(delegates),
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
    ownerDiamonds = 20;
  });

  afterAll(async () => {
    await app.close();
  });

  it("enforces Helmet security headers, forged token rejection, and banned account blocking", async () => {
    const publicRes = await request(app.getHttpServer())
      .get("/api/v1/leaderboard/monthly")
      .expect(200);
    expect(publicRes.headers["x-content-type-options"]).toBe("nosniff");
    expect(publicRes.headers["x-frame-options"]).toBe("SAMEORIGIN");

    // Forged signature signed with wrong secret -> 401 INVALID_TOKEN
    const forgedToken = await jwtService.signAsync(
      { sub: OWNER_ID, email: "owner@example.test", role: "USER" },
      { secret: "completely-wrong-secret-key-000000" }
    );
    const forgedRes = await request(app.getHttpServer())
      .get("/api/v1/srs/due")
      .set("Authorization", `Bearer ${forgedToken}`)
      .expect(401);
    expect(forgedRes.body.code).toBe("INVALID_TOKEN");

    // Banned user blocked even with validly signed JWT -> 403 ACCOUNT_BANNED
    const bannedToken = await jwtService.signAsync(
      { sub: BANNED_USER_ID, email: "banned@example.test", role: "USER" },
      { secret: getAppEnv().JWT_ACCESS_SECRET }
    );
    const bannedRes = await request(app.getHttpServer())
      .get("/api/v1/srs/due")
      .set("Authorization", `Bearer ${bannedToken}`)
      .expect(403);
    expect(bannedRes.body.code).toBe("ACCOUNT_BANNED");
  });

  it("blocks cross-user IDOR access, enforces expired exam deadlines, preserves non-negative diamond ledger, and rate limits abuse", async () => {
    const ownerToken = await jwtService.signAsync(
      { sub: OWNER_ID, email: "owner@example.test", role: "USER" },
      { secret: getAppEnv().JWT_ACCESS_SECRET }
    );
    const attackerToken = await jwtService.signAsync(
      { sub: ATTACKER_ID, email: "attacker@example.test", role: "USER" },
      { secret: getAppEnv().JWT_ACCESS_SECRET }
    );

    // 1. Cross-user IDOR checks -> 403 FORBIDDEN across private deck, exam session & speech assessment
    await request(app.getHttpServer())
      .get(`/api/v1/vocabulary/decks/${PRIVATE_DECK_SLUG}`)
      .set("Authorization", `Bearer ${attackerToken}`)
      .expect(403);

    await request(app.getHttpServer())
      .get(`/api/v1/exams/sessions/${EXPIRED_SESSION_ID}/questions`)
      .set("Authorization", `Bearer ${attackerToken}`)
      .expect(403);

    await request(app.getHttpServer())
      .get(`/api/v1/ai/speech-assessments/${ASSESSMENT_ID}`)
      .set("Authorization", `Bearer ${attackerToken}`)
      .expect(403);

    // 2. Expired TEST session rejects late answers (403 EXAM_EXPIRED)
    const lateRes = await request(app.getHttpServer())
      .put(`/api/v1/exams/sessions/${EXPIRED_SESSION_ID}/answers`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ answers: [{ questionNumber: 1, selectedValue: "A" }] })
      .expect(403);
    expect(lateRes.body.code).toBe("EXAM_EXPIRED");

    // 3. Insufficient diamonds cannot drive balance negative
    const poorRes = await request(app.getHttpServer())
      .post("/api/v1/shop/purchase")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ itemId: EXPENSIVE_ITEM_ID })
      .expect(400);
    expect(poorRes.body.code).toBe("INSUFFICIENT_DIAMONDS");
    expect(ownerDiamonds).toBe(20);

    // 4. Malformed UUID rejects cleanly with 400 + traceId
    const badUuidRes = await request(app.getHttpServer())
      .get("/api/v1/ai/speech-assessments/not-a-uuid")
      .set("Authorization", `Bearer ${ownerToken}`)
      .expect(400);
    expect(badUuidRes.body.traceId).toBeTruthy();

    // 5. Rate limiter blocks burst abuse on /auth/magic-link (>10 req/min -> 429)
    let got429 = false;
    for (let i = 0; i < 12; i += 1) {
      const rlRes = await request(app.getHttpServer())
        .post("/api/v1/auth/magic-link")
        .send({ email: `spam${i}@example.test` });
      if (rlRes.status === 429) {
        expect(rlRes.body.code).toBe("RATE_LIMIT_EXCEEDED");
        got429 = true;
        break;
      }
    }
    expect(got429).toBe(true);
  });
});
