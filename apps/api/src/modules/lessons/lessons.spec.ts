import { randomUUID } from "node:crypto";
import type { INestApplication } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { configureApp } from "../../app.bootstrap";
import { AppModule } from "../../app.module";
import { getAppEnv } from "../../core/config/env";
import { PrismaService } from "../../core/database/prisma.service";
import { QueueService } from "../../core/queue/queue.service";

const FREE_LESSON_ID = randomUUID();
const PRO_LESSON_ID = randomUUID();
const SENTENCE_ID = randomUUID();
const FREE_USER_ID = randomUUID();
const PRO_USER_ID = randomUUID();

describe("Lessons, Dictation & Shadowing API (/api/v1/lessons)", () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let queueService: QueueService;

  const rewardsByKey = new Set<string>();
  const createdLessons: Array<Record<string, unknown>> = [];
  const attempts: Array<Record<string, unknown>> = [];

  const lessonsCatalog = [
    {
      id: FREE_LESSON_ID,
      slug: "morning-routine",
      title: "Morning Routine",
      description: "Free A2 conversation",
      mediaType: "AUDIO",
      youtubeVideoId: null,
      mediaAssetId: null,
      thumbnailUrl: null,
      cefrLevel: "A2",
      durationSec: 45,
      isPro: false,
      isDailyFeatured: true,
      visibility: "SYSTEM",
      authorId: null,
      status: "READY",
      viewCount: 12,
      topics: [{ topic: { slug: "daily-life" } }],
      sentences: [
        {
          id: SENTENCE_ID,
          lessonId: FREE_LESSON_ID,
          orderIndex: 0,
          startMs: 0,
          endMs: 2500,
          text: "I wake up at seven o'clock.",
          ipaText: "/aɪ weɪk ʌp æt ˈsevən əˈklɑːk/",
          translationsJson: { vi: "Tôi thức dậy lúc bảy giờ." },
          wordsTimingJson: null,
        },
      ],
    },
    {
      id: PRO_LESSON_ID,
      slug: "pro-briefing",
      title: "Executive Briefing",
      description: "Pro C1 video",
      mediaType: "YOUTUBE",
      youtubeVideoId: "abc123456",
      mediaAssetId: null,
      thumbnailUrl: null,
      cefrLevel: "C1",
      durationSec: 180,
      isPro: true,
      isDailyFeatured: false,
      visibility: "SYSTEM",
      authorId: null,
      status: "READY",
      viewCount: 55,
      topics: [{ topic: { slug: "business" } }],
      sentences: [
        {
          id: randomUUID(),
          lessonId: PRO_LESSON_ID,
          orderIndex: 0,
          startMs: 0,
          endMs: 4000,
          text: "Welcome to our quarterly strategy briefing.",
          ipaText: null,
          translationsJson: null,
          wordsTimingJson: null,
        },
      ],
    },
  ];

  const delegates = {
    user: {
      findUnique: async ({ where }: { where: { id: string } }) => ({
        id: where.id,
        email: `${where.id}@example.test`,
        role: "USER",
        status: "ACTIVE",
        ageVerifiedAt: new Date(),
        entitlements:
          where.id === PRO_USER_ID
            ? [{ id: randomUUID(), tier: "PRO", revokedAt: null, expiresAt: null }]
            : [],
      }),
    },
    lesson: {
      findMany: async ({
        where,
      }: {
        where?: { cefrLevel?: string; isDailyFeatured?: boolean };
      }) =>
        lessonsCatalog.filter(
          (l) =>
            (!where?.cefrLevel || l.cefrLevel === where.cefrLevel) &&
            (where?.isDailyFeatured === undefined ||
              l.isDailyFeatured === where.isDailyFeatured)
        ),
      count: async ({ where }: { where?: { cefrLevel?: string } }) =>
        lessonsCatalog.filter(
          (l) => !where?.cefrLevel || l.cefrLevel === where.cefrLevel
        ).length,
      findUnique: async ({ where }: { where: { slug: string } }) =>
        lessonsCatalog.find((l) => l.slug === where.slug) ?? null,
      create: async ({ data }: { data: Record<string, unknown> }) => {
        createdLessons.push(data);
        return data;
      },
    },
    lessonSentence: {
      findFirst: async ({
        where,
      }: {
        where: { id: string; lessonId: string };
      }) => {
        const lesson = lessonsCatalog.find((l) => l.id === where.lessonId);
        return lesson?.sentences.find((s) => s.id === where.id) ?? null;
      },
      count: async ({ where }: { where: { lessonId: string } }) => {
        const lesson = lessonsCatalog.find((l) => l.id === where.lessonId);
        return lesson?.sentences.length ?? 0;
      },
    },
    sentenceAttempt: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        attempts.push(data);
        return data;
      },
    },
    lessonProgress: {
      findUnique: async () => null,
      upsert: async () => ({}),
    },
    diamondLedger: {
      findUnique: async ({ where }: { where: { idempotencyKey: string } }) =>
        rewardsByKey.has(where.idempotencyKey) ? { id: "dup" } : null,
      create: async ({
        data,
      }: {
        data: { idempotencyKey: string };
      }) => {
        rewardsByKey.add(data.idempotencyKey);
        return data;
      },
    },
    xpLedger: {
      create: async () => ({}),
    },
    userStats: {
      findUnique: async () => ({ diamondBalance: 10, xpTotal: 50 }),
      upsert: async () => ({}),
    },
    mediaAsset: {
      findUnique: async () => null,
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
    queueService = moduleRef.get(QueueService);
  });

  beforeEach(() => {
    rewardsByKey.clear();
    createdLessons.length = 0;
    attempts.length = 0;
    queueService.memoryJobs.length = 0;
  });

  afterAll(async () => {
    await app.close();
  });

  it("filters lessons and enforces Pro transcript redaction on guest/FREE vs PRO users", async () => {
    const listRes = await request(app.getHttpServer())
      .get("/api/v1/lessons?level=A2")
      .expect(200);
    expect(listRes.body.items).toHaveLength(1);
    expect(listRes.body.items[0].slug).toBe("morning-routine");

    // Guest hits Pro lesson -> sentences redacted
    const guestProRes = await request(app.getHttpServer())
      .get("/api/v1/lessons/pro-briefing")
      .expect(200);
    expect(guestProRes.body.sentences).toBeNull();

    // PRO user hits Pro lesson -> sentences unlocked
    const proToken = await jwtService.signAsync(
      { sub: PRO_USER_ID, email: "pro@example.test", role: "USER" },
      { secret: getAppEnv().JWT_ACCESS_SECRET }
    );
    const proDetailRes = await request(app.getHttpServer())
      .get("/api/v1/lessons/pro-briefing")
      .set("Authorization", `Bearer ${proToken}`)
      .expect(200);
    expect(proDetailRes.body.sentences).toHaveLength(1);
  });

  it("grades Dictation/Shadowing attempts with idempotent rewards and gates YouTube import to PRO", async () => {
    const freeToken = await jwtService.signAsync(
      { sub: FREE_USER_ID, email: "free@example.test", role: "USER" },
      { secret: getAppEnv().JWT_ACCESS_SECRET }
    );
    const proToken = await jwtService.signAsync(
      { sub: PRO_USER_ID, email: "pro@example.test", role: "USER" },
      { secret: getAppEnv().JWT_ACCESS_SECRET }
    );

    // 1. First Dictation pass rewards 3 diamonds
    const firstAttempt = await request(app.getHttpServer())
      .post(`/api/v1/lessons/${FREE_LESSON_ID}/attempts`)
      .set("Authorization", `Bearer ${freeToken}`)
      .send({
        sentenceId: SENTENCE_ID,
        mode: "DICTATION",
        accuracyScore: 95,
        mistakesCount: 0,
        replayCount: 1,
      })
      .expect(200);

    expect(firstAttempt.body).toMatchObject({
      passed: true,
      diamondsEarned: 3,
      streakUpdated: true,
    });

    // 2. Replay same sentence in DICTATION -> 0 duplicate diamonds
    const repeatAttempt = await request(app.getHttpServer())
      .post(`/api/v1/lessons/${FREE_LESSON_ID}/attempts`)
      .set("Authorization", `Bearer ${freeToken}`)
      .send({
        sentenceId: SENTENCE_ID,
        mode: "DICTATION",
        accuracyScore: 98,
        mistakesCount: 0,
        replayCount: 0,
      })
      .expect(200);

    expect(repeatAttempt.body.diamondsEarned).toBe(0);

    // 3. Shadowing mode earns independent 4 diamonds
    const shadowAttempt = await request(app.getHttpServer())
      .post(`/api/v1/lessons/${FREE_LESSON_ID}/attempts`)
      .set("Authorization", `Bearer ${freeToken}`)
      .send({
        sentenceId: SENTENCE_ID,
        mode: "SHADOWING",
        accuracyScore: 82,
        mistakesCount: 1,
        replayCount: 0,
      })
      .expect(200);

    expect(shadowAttempt.body).toMatchObject({
      passed: true,
      diamondsEarned: 4,
    });

    // 4. FREE user blocked on YouTube import; PRO user queues BullMQ job
    await request(app.getHttpServer())
      .post("/api/v1/lessons/import-youtube")
      .set("Authorization", `Bearer ${freeToken}`)
      .send({ youtubeUrl: "https://www.youtube.com/watch?v=abc123456" })
      .expect(403);

    const importRes = await request(app.getHttpServer())
      .post("/api/v1/lessons/import-youtube")
      .set("Authorization", `Bearer ${proToken}`)
      .send({ youtubeUrl: "https://www.youtube.com/watch?v=abc123456" })
      .expect(202);

    expect(importRes.body.jobId).toBeTruthy();
    expect(queueService.memoryJobs).toHaveLength(1);
    expect(queueService.memoryJobs[0]?.queueName).toBe("media-ingestion");
  });
});
