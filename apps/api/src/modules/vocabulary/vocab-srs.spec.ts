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
import { calculateSm2NextState } from "../srs/sm2";

const USER_ID = randomUUID();
const CARD_1_ID = randomUUID();

describe("Vocabulary, Dictionary & SM-2 SRS (/api/v1/vocabulary, /api/v1/srs)", () => {
  let app: INestApplication;
  let jwtService: JwtService;

  const createdDecks: Array<Record<string, unknown>> = [];
  const reviewState = new Map<string, Record<string, unknown>>();

  const proDeck = {
    id: randomUUID(),
    slug: "ielts-power-30",
    title: "IELTS Power 30",
    description: "Pro vocabulary pack",
    cefrLevel: "C1",
    ownerId: null,
    visibility: "SYSTEM" as const,
    isPro: true,
    wordCount: 30,
    owner: null,
    cards: Array.from({ length: 30 }, (_, idx) => ({
      id: idx === 0 ? CARD_1_ID : randomUUID(),
      term: `term-${idx + 1}`,
      phonetic: null,
      partOfSpeech: "noun",
      definitionsJson: { meaning: `Meaning ${idx + 1}` },
      audioUrl: null,
      orderIndex: idx,
    })),
  };

  const fakePrisma = {
    user: {
      findUnique: async ({ where }: { where: { id: string } }) => ({
        id: where.id,
        email: "vocab@example.test",
        role: "USER",
        status: "ACTIVE",
        ageVerifiedAt: new Date(),
        entitlements: [],
      }),
    },
    vocabDeck: {
      findMany: async () => [proDeck],
      count: async () => 1,
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const saved = {
          id: randomUUID(),
          ...data,
          owner: { displayName: "Vocab Learner" },
        };
        createdDecks.push(saved);
        return saved;
      },
      findUnique: async ({ where }: { where: { slug: string } }) =>
        where.slug === proDeck.slug ? proDeck : null,
    },
    vocabCard: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        where.id === CARD_1_ID ? { id: CARD_1_ID } : null,
    },
    userVocabReview: {
      findMany: async () => [],
      count: async () => 0,
      findUnique: async ({
        where,
      }: {
        where: { userId_cardId: { userId: string; cardId: string } };
      }) => reviewState.get(`${where.userId_cardId.userId}:${where.userId_cardId.cardId}`) ?? null,
      upsert: async ({
        where,
        create,
      }: {
        where: { userId_cardId: { userId: string; cardId: string } };
        create: Record<string, unknown>;
      }) => {
        reviewState.set(`${where.userId_cardId.userId}:${where.userId_cardId.cardId}`, create);
        return create;
      },
    },
    dictionaryEntry: {
      findMany: async () => [],
      findUnique: async ({ where }: { where: { word: string } }) =>
        where.word === "resilient"
          ? {
              word: "resilient",
              locale: "en",
              phoneticsJson: [{ locale: "en-US", ipa: "/rɪˈzɪl.jənt/", audioUrl: null }],
              meaningsJson: [
                {
                  partOfSpeech: "adjective",
                  definition: "able to recover quickly",
                  example: null,
                },
              ],
            }
          : null,
    },
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
    createdDecks.length = 0;
    reviewState.clear();
  });

  afterAll(async () => {
    await app.close();
  });

  it("computes deterministic SM-2 intervals across Good and Again ratings", () => {
    const firstGood = calculateSm2NextState(
      { easeFactor: 2.5, intervalDays: 0, repetitions: 0 },
      3
    );
    expect(firstGood.intervalDays).toBe(1);
    expect(firstGood.state).toBe("LEARNING");

    const secondGood = calculateSm2NextState(firstGood, 3);
    expect(secondGood.intervalDays).toBe(6);
    expect(secondGood.state).toBe("REVIEW");

    const againReset = calculateSm2NextState(secondGood, 1);
    expect(againReset.intervalDays).toBe(1);
    expect(againReset.repetitions).toBe(0);
    expect(againReset.state).toBe("RELEARNING");
  });

  it("enforces 24-card preview cap on Pro decks, creates private decks, and saves SM-2 reviews", async () => {
    const token = await jwtService.signAsync(
      { sub: USER_ID, email: "vocab@example.test", role: "USER" },
      { secret: getAppEnv().JWT_ACCESS_SECRET }
    );

    const previewRes = await request(app.getHttpServer())
      .get("/api/v1/vocabulary/decks/ielts-power-30")
      .expect(200);
    expect(previewRes.body.previewCards).toHaveLength(24);
    expect(previewRes.body.totalCards).toBe(30);

    const createRes = await request(app.getHttpServer())
      .post("/api/v1/vocabulary/decks")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "Personal Connectors",
        cefrLevel: "B2",
        visibility: "PRIVATE",
        cards: [{ term: "moreover", meaning: "in addition" }],
      })
      .expect(201);
    expect(createRes.body.deck.visibility).toBe("PRIVATE");

    const dictRes = await request(app.getHttpServer())
      .get("/api/v1/dictionary/words/resilient")
      .expect(200);
    expect(dictRes.body.word).toBe("resilient");

    const reviewRes = await request(app.getHttpServer())
      .post("/api/v1/srs/reviews")
      .set("Authorization", `Bearer ${token}`)
      .send({ cardId: CARD_1_ID, rating: 3 })
      .expect(200);
    expect(reviewRes.body.intervalDays).toBe(1);
    expect(reviewRes.body.state).toBe("LEARNING");
  });
});
