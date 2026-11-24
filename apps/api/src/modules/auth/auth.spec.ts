import { createHash, randomUUID } from "node:crypto";
import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { configureApp } from "../../app.bootstrap";
import { AppModule } from "../../app.module";
import { PrismaService } from "../../core/database/prisma.service";
import { RedisService } from "../../core/redis/redis.service";

interface InMemoryUser {
  id: string;
  email: string;
  username: string | null;
  displayName: string;
  avatarUrl: string | null;
  role: "USER" | "MODERATOR" | "ADMIN";
  status: "ACTIVE" | "BANNED" | "SUSPENDED";
  birthDate: Date | null;
  ageVerifiedAt: Date | null;
  preferredUiLocale: string;
  preferredTranslateLang: string;
}

interface InMemorySession {
  id: string;
  userId: string;
  familyId: string;
  refreshTokenHash: string;
  userAgent: string | null;
  ipHash: string | null;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
}

function createFakeAuthPrisma() {
  const users = new Map<string, InMemoryUser>();
  const sessions = new Map<string, InMemorySession>();

  const delegates = {
    user: {
      findUnique: async ({ where }: { where: { id?: string; email?: string } }) => {
        for (const u of users.values()) {
          if ((where.id && u.id === where.id) || (where.email && u.email === where.email)) {
            return {
              ...u,
              entitlements: [],
              stats: {
                xpTotal: 0,
                level: 1,
                diamondBalance: 0,
                currentStreakDays: 0,
                longestStreakDays: 0,
                streakFreezesOwned: 0,
                activeTimeSec: 0,
              },
            };
          }
        }
        return null;
      },
      findFirst: async ({
        where,
      }: {
        where: { username?: string; NOT?: { id?: string } };
      }) => {
        for (const u of users.values()) {
          if (where.username && u.username === where.username) {
            if (where.NOT?.id && u.id === where.NOT.id) continue;
            return { id: u.id };
          }
        }
        return null;
      },
      create: async ({
        data,
      }: {
        data: { email: string; displayName: string; avatarUrl?: string | null };
      }) => {
        const record: InMemoryUser = {
          id: randomUUID(),
          email: data.email,
          username: null,
          displayName: data.displayName,
          avatarUrl: data.avatarUrl ?? null,
          role: "USER",
          status: "ACTIVE",
          birthDate: null,
          ageVerifiedAt: null,
          preferredUiLocale: "en",
          preferredTranslateLang: "vi",
        };
        users.set(record.id, record);
        return record;
      },
      update: async ({
        where,
        data,
      }: {
        where: { id: string };
        data: Partial<InMemoryUser>;
      }) => {
        const existing = users.get(where.id);
        if (!existing) throw { code: "P2025" };
        const updated = {
          ...existing,
          ...(data.username !== undefined ? { username: data.username } : {}),
          ...(data.displayName !== undefined ? { displayName: data.displayName } : {}),
          ...(data.preferredUiLocale !== undefined
            ? { preferredUiLocale: data.preferredUiLocale }
            : {}),
          ...(data.preferredTranslateLang !== undefined
            ? { preferredTranslateLang: data.preferredTranslateLang }
            : {}),
          ...(data.birthDate !== undefined ? { birthDate: data.birthDate } : {}),
          ...(data.ageVerifiedAt !== undefined
            ? { ageVerifiedAt: data.ageVerifiedAt }
            : {}),
        };
        users.set(where.id, updated);
        return updated;
      },
    },
    authSession: {
      findUnique: async ({
        where,
      }: {
        where: { id?: string; refreshTokenHash?: string };
      }) => {
        for (const s of sessions.values()) {
          if (
            (where.id && s.id === where.id) ||
            (where.refreshTokenHash && s.refreshTokenHash === where.refreshTokenHash)
          ) {
            return { ...s };
          }
        }
        return null;
      },
      create: async ({
        data,
      }: {
        data: {
          userId: string;
          familyId: string;
          refreshTokenHash: string;
          userAgent?: string | null;
          ipHash?: string | null;
          expiresAt: Date;
        };
      }) => {
        const rec: InMemorySession = {
          id: randomUUID(),
          userId: data.userId,
          familyId: data.familyId,
          refreshTokenHash: data.refreshTokenHash,
          userAgent: data.userAgent ?? null,
          ipHash: data.ipHash ?? null,
          expiresAt: data.expiresAt,
          revokedAt: null,
          createdAt: new Date(),
        };
        sessions.set(rec.id, rec);
        return rec;
      },
      update: async ({
        where,
        data,
      }: {
        where: { id: string };
        data: Partial<InMemorySession>;
      }) => {
        const s = sessions.get(where.id);
        if (!s) throw { code: "P2025" };
        const updated = { ...s, ...data };
        sessions.set(where.id, updated);
        return updated;
      },
      updateMany: async ({
        where,
        data,
      }: {
        where: { familyId?: string; revokedAt?: null };
        data: Partial<InMemorySession>;
      }) => {
        for (const [id, s] of sessions.entries()) {
          if (
            (!where.familyId || s.familyId === where.familyId) &&
            (where.revokedAt === undefined || s.revokedAt === where.revokedAt)
          ) {
            sessions.set(id, { ...s, ...data });
          }
        }
        return { count: 1 };
      },
    },
    oAuthAccount: {
      findUnique: async () => null,
      create: async () => ({}),
    },
  };

  return {
    ...delegates,
    $transaction: async <T>(fn: (tx: typeof delegates) => Promise<T>) => fn(delegates),
    _clear: () => {
      users.clear();
      sessions.clear();
    },
  };
}

describe("Auth & Users API (/api/v1/auth, /api/v1/users)", () => {
  let app: INestApplication;
  let redis: RedisService;
  const fakePrisma = createFakeAuthPrisma();

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
    redis = moduleRef.get(RedisService);
  });

  beforeEach(() => {
    fakePrisma._clear();
  });

  afterAll(async () => {
    await app.close();
  });

  it("rejects invalid email on POST /api/v1/auth/magic-link with standardized error envelope", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/auth/magic-link")
      .send({ email: "not-an-email" })
      .expect(400);

    expect(res.body).toMatchObject({
      statusCode: 400,
      code: "VALIDATION_ERROR",
      traceId: expect.any(String),
    });
  });

  it("verifies magic link, fetches /users/me, updates onboarding & preferences, rotates refresh token, and revokes family on reuse", async () => {
    const rawMagicToken = "test_magic_link_token_12345";
    const magicHash = createHash("sha256").update(rawMagicToken).digest("hex");
    await redis.setJson(
      `magic_link:${magicHash}`,
      { email: "learner@linguacraft.app" },
      600
    );

    // 1. Verify magic link -> sets lc_refresh cookie + returns JWT accessToken
    const verifyRes = await request(app.getHttpServer())
      .post(`/api/v1/auth/magic-link/verify?token=${rawMagicToken}`)
      .expect(200);

    const accessToken = verifyRes.body.accessToken as string;
    expect(typeof accessToken).toBe("string");

    const cookies = verifyRes.headers["set-cookie"] as unknown as string[];
    const firstRefreshCookie = cookies?.[0] ?? "";
    expect(firstRefreshCookie).toContain("lc_refresh=");

    // Single-use magic link cannot be replayed
    await request(app.getHttpServer())
      .post(`/api/v1/auth/magic-link/verify?token=${rawMagicToken}`)
      .expect(401);

    // 2. GET /users/me requires Bearer token
    await request(app.getHttpServer()).get("/api/v1/users/me").expect(401);

    const meRes = await request(app.getHttpServer())
      .get("/api/v1/users/me")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);

    expect(meRes.body).toMatchObject({
      email: "learner@linguacraft.app",
      entitlementTier: "FREE",
      ageVerified: false,
    });

    // 3. PATCH /users/me/onboarding sets username and age verification
    const onboardRes = await request(app.getHttpServer())
      .patch("/api/v1/users/me/onboarding")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        username: "alex_english",
        birthDate: "1999-05-12",
        preferredTranslateLang: "vi",
      })
      .expect(200);

    expect(onboardRes.body.user.username).toBe("alex_english");
    expect(onboardRes.body.user.ageVerified).toBe(true);

    // 4. PATCH /users/me/preferences updates displayName & locale
    const prefRes = await request(app.getHttpServer())
      .patch("/api/v1/users/me/preferences")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        displayName: "Alex English",
        preferredUiLocale: "vi",
      })
      .expect(200);

    expect(prefRes.body.user.displayName).toBe("Alex English");
    expect(prefRes.body.user.preferredUiLocale).toBe("vi");

    // 5. POST /auth/refresh rotates refresh cookie
    const refreshRes = await request(app.getHttpServer())
      .post("/api/v1/auth/refresh")
      .set("Cookie", firstRefreshCookie)
      .expect(200);

    expect(typeof refreshRes.body.accessToken).toBe("string");
    const rotatedCookies = refreshRes.headers["set-cookie"] as unknown as string[];
    const secondRefreshCookie = rotatedCookies?.[0] ?? "";

    // 6. Presenting reused firstRefreshCookie triggers family revocation (401 REFRESH_REUSE_DETECTED)
    const reuseRes = await request(app.getHttpServer())
      .post("/api/v1/auth/refresh")
      .set("Cookie", firstRefreshCookie)
      .expect(401);

    expect(reuseRes.body.code).toBe("REFRESH_REUSE_DETECTED");

    // Second rotated cookie was also cascade-revoked!
    await request(app.getHttpServer())
      .post("/api/v1/auth/refresh")
      .set("Cookie", secondRefreshCookie)
      .expect(401);
  });
});
