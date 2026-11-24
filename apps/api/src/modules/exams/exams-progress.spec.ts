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
import {
  calculateIeltsBand,
  calculateToeicScaled,
} from "./exam-scoring";

const USER_ID = randomUUID();
const EXAM_SET_ID = randomUUID();
const EXAM_ID = randomUUID();
const PART_ID = randomUUID();
const GROUP_ID = randomUUID();
const QUESTION_1_ID = randomUUID();
const QUESTION_2_ID = randomUUID();

interface InMemorySessionRow {
  id: string;
  userId: string;
  examId: string;
  mode: "TEST" | "PRACTICE";
  selectedParts: number[];
  status: "IN_PROGRESS" | "COMPLETED" | "ABANDONED";
  startedAt: Date;
  deadlineAt: Date | null;
  completedAt: Date | null;
  timeSpentSeconds: number;
  totalCorrect: number | null;
  totalQuestions: number;
  ieltsBand: number | null;
  toeicListening: number | null;
  toeicReading: number | null;
  toeicTotalScaled: number | null;
}

interface InMemoryAnswerRow {
  sessionId: string;
  questionNumber: number;
  selectedValue: string;
  isFlagged: boolean;
  isCorrect: boolean | null;
}

describe("Exams & Progress API (/api/v1/exams, /api/v1/streak)", () => {
  let app: INestApplication;
  let jwtService: JwtService;

  const sessions = new Map<string, InMemorySessionRow>();
  const answers = new Map<string, InMemoryAnswerRow>();
  const diamondLedgerKeys = new Set<string>();
  let userStatsState = {
    diamondBalance: 10,
    xpTotal: 0,
    level: 1,
    currentStreakDays: 0,
    longestStreakDays: 0,
    lastCheckInDate: null as Date | null,
  };

  const sampleExam = {
    id: EXAM_ID,
    examSetId: EXAM_SET_ID,
    slug: "cambridge-18-reading-1",
    titleJson: { en: "Cambridge 18 Reading Test 1" },
    skillSection: "reading",
    totalQuestions: 2,
    totalDurationSeconds: 1800,
    isFree: true,
    sortOrder: 1,
    attemptCount: 0,
    examSet: {
      id: EXAM_SET_ID,
      slug: "cambridge-18",
      nameJson: { en: "Cambridge IELTS 18" },
      source: "Cambridge",
      year: 2023,
      totalExams: 1,
      examType: { code: "IELTS" as const },
    },
    parts: [
      {
        id: PART_ID,
        examId: EXAM_ID,
        partNumber: 1,
        section: "reading",
        name: "Passage 1: Urban Agriculture",
        questionCount: 2,
        mediaAssetId: null,
        groups: [
          {
            id: GROUP_ID,
            partId: PART_ID,
            orderIndex: 0,
            stimulusHtml: "Vertical farms reduce water consumption by 95%.",
            imageUrls: [],
            optionsJson: null,
            questions: [
              {
                id: QUESTION_1_ID,
                groupId: GROUP_ID,
                questionNumber: 1,
                orderIndex: 0,
                answerFormat: "single",
                promptHtml: "Vertical farms save water compared to field crops.",
                choicesJson: [
                  { value: "TRUE", label: "TRUE" },
                  { value: "FALSE", label: "FALSE" },
                ],
                maxWords: null,
                skillTag: "True / False / Not Given",
                correctAnswer: "TRUE",
                explanationHtml: "<p>Text notes a 95% reduction.</p>",
              },
              {
                id: QUESTION_2_ID,
                groupId: GROUP_ID,
                questionNumber: 2,
                orderIndex: 1,
                answerFormat: "text",
                promptHtml: "Water saved percentage figure: ___%",
                choicesJson: null,
                maxWords: 1,
                skillTag: "Sentence Completion",
                correctAnswer: "95",
                explanationHtml: "<p>95% is explicitly mentioned.</p>",
              },
            ],
          },
        ],
      },
    ],
  };

  const delegates = {
    user: {
      findUnique: async ({ where }: { where: { id: string } }) => ({
        id: where.id,
        email: "exam@example.test",
        role: "USER",
        status: "ACTIVE",
        ageVerifiedAt: new Date(),
        entitlements: [],
      }),
    },
    examSet: {
      findMany: async () => [sampleExam.examSet],
      findUnique: async ({ where }: { where: { slug: string } }) =>
        where.slug === sampleExam.examSet.slug
          ? { ...sampleExam.examSet, exams: [sampleExam] }
          : null,
    },
    exam: {
      findUnique: async ({
        where,
      }: {
        where: { id?: string; slug?: string };
      }) => {
        if (where.id === EXAM_ID || where.slug === sampleExam.slug) {
          return sampleExam;
        }
        return null;
      },
      update: async () => sampleExam,
    },
    examSession: {
      findFirst: async ({
        where,
      }: {
        where: { userId: string; examId: string; status: string };
      }) => {
        for (const s of sessions.values()) {
          if (
            s.userId === where.userId &&
            s.examId === where.examId &&
            s.status === where.status
          ) {
            return { ...s };
          }
        }
        return null;
      },
      findUnique: async ({ where }: { where: { id: string } }) => {
        const s = sessions.get(where.id);
        if (!s) return null;
        const sessionAnswers = Array.from(answers.values()).filter(
          (a) => a.sessionId === s.id
        );
        return {
          ...s,
          exam: sampleExam,
          answers: sessionAnswers,
        };
      },
      findMany: async ({
        where,
      }: {
        where: { userId: string; status?: string };
      }) => {
        return Array.from(sessions.values())
          .filter(
            (s) =>
              s.userId === where.userId &&
              (!where.status || s.status === where.status)
          )
          .map((s) => ({
            ...s,
            exam: sampleExam,
            answers: Array.from(answers.values()).filter(
              (a) => a.sessionId === s.id
            ),
          }));
      },
      count: async ({ where }: { where: { userId: string } }) =>
        Array.from(sessions.values()).filter((s) => s.userId === where.userId)
          .length,
      create: async ({ data }: { data: Partial<InMemorySessionRow> }) => {
        const rec: InMemorySessionRow = {
          id: randomUUID(),
          userId: data.userId!,
          examId: data.examId!,
          mode: data.mode!,
          selectedParts: data.selectedParts ?? [],
          status: "IN_PROGRESS",
          startedAt: data.startedAt ?? new Date(),
          deadlineAt: data.deadlineAt ?? null,
          completedAt: null,
          timeSpentSeconds: 0,
          totalCorrect: null,
          totalQuestions: data.totalQuestions ?? 2,
          ieltsBand: null,
          toeicListening: null,
          toeicReading: null,
          toeicTotalScaled: null,
        };
        sessions.set(rec.id, rec);
        return rec;
      },
      update: async ({
        where,
        data,
      }: {
        where: { id: string };
        data: Partial<InMemorySessionRow>;
      }) => {
        const s = sessions.get(where.id);
        if (!s) throw { code: "P2025" };
        const updated = { ...s, ...data };
        sessions.set(where.id, updated);
        return updated;
      },
    },
    sessionAnswer: {
      upsert: async ({
        where,
        create,
      }: {
        where: {
          sessionId_questionNumber: { sessionId: string; questionNumber: number };
        };
        create: InMemoryAnswerRow;
      }) => {
        const k = `${where.sessionId_questionNumber.sessionId}:${where.sessionId_questionNumber.questionNumber}`;
        const rec = { ...create, isCorrect: create.isCorrect ?? null };
        answers.set(k, rec);
        return rec;
      },
      update: async ({
        where,
        data,
      }: {
        where: {
          sessionId_questionNumber: { sessionId: string; questionNumber: number };
        };
        data: Partial<InMemoryAnswerRow>;
      }) => {
        const k = `${where.sessionId_questionNumber.sessionId}:${where.sessionId_questionNumber.questionNumber}`;
        const existing = answers.get(k);
        if (!existing) throw { code: "P2025" };
        const updated = { ...existing, ...data };
        answers.set(k, updated);
        return updated;
      },
    },
    mediaAsset: {
      findUnique: async () => null,
    },
    diamondLedger: {
      findUnique: async ({ where }: { where: { idempotencyKey: string } }) =>
        diamondLedgerKeys.has(where.idempotencyKey)
          ? { id: "dup", balanceAfter: userStatsState.diamondBalance }
          : null,
      create: async ({ data }: { data: { idempotencyKey: string } }) => {
        diamondLedgerKeys.add(data.idempotencyKey);
        return data;
      },
    },
    userStats: {
      findUnique: async () => userStatsState,
      upsert: async ({
        update,
      }: {
        update: Partial<typeof userStatsState>;
      }) => {
        userStatsState = { ...userStatsState, ...update };
        return userStatsState;
      },
      findMany: async () => [],
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
    sessions.clear();
    answers.clear();
    diamondLedgerKeys.clear();
    userStatsState = {
      diamondBalance: 10,
      xpTotal: 0,
      level: 1,
      currentStreakDays: 0,
      longestStreakDays: 0,
      lastCheckInDate: null,
    };
  });

  afterAll(async () => {
    await app.close();
  });

  it("calculates deterministic IELTS bands and TOEIC scaled scores", () => {
    expect(calculateIeltsBand(39, 40)).toBe(9.0);
    expect(calculateIeltsBand(26, 40)).toBe(6.5);
    const toeic = calculateToeicScaled(90, 100, 80, 100);
    expect(toeic.listening).toBe(445);
    expect(toeic.reading).toBe(395);
    expect(toeic.total).toBe(840);
  });

  it("runs complete PRACTICE exam lifecycle, enforces TEST check guard, and populates analytics + streak check-in", async () => {
    const token = await jwtService.signAsync(
      { sub: USER_ID, email: "exam@example.test", role: "USER" },
      { secret: getAppEnv().JWT_ACCESS_SECRET }
    );

    // 1. Start PRACTICE session
    const startRes = await request(app.getHttpServer())
      .post("/api/v1/exams/sessions/start")
      .set("Authorization", `Bearer ${token}`)
      .send({ examId: EXAM_ID, mode: "PRACTICE" })
      .expect(201);

    const sessionId = startRes.body.session.id as string;

    // 2. Fetch questions — answer key must NOT be leaked in response
    const qRes = await request(app.getHttpServer())
      .get(`/api/v1/exams/sessions/${sessionId}/questions`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    const firstQ = qRes.body.groups[0].questions[0];
    expect(firstQ.correctAnswer).toBeUndefined();

    // 3. Upsert answers (Q1 right, Q2 wrong)
    await request(app.getHttpServer())
      .put(`/api/v1/exams/sessions/${sessionId}/answers`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        answers: [
          { questionNumber: 1, selectedValue: "TRUE" },
          { questionNumber: 2, selectedValue: "50" },
        ],
      })
      .expect(200);

    // 4. Inline check works in PRACTICE mode
    const checkRes = await request(app.getHttpServer())
      .get(`/api/v1/exams/sessions/${sessionId}/check/1`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(checkRes.body.isCorrect).toBe(true);

    // 5. Submit exam session -> scores 1/2
    const submitRes = await request(app.getHttpServer())
      .post(`/api/v1/exams/sessions/${sessionId}/submit`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(submitRes.body.sessionResult.accuracyPct).toBe(50);

    // 6. Result + Analytics + History routes resolve before :slug
    const resultRes = await request(app.getHttpServer())
      .get(`/api/v1/exams/sessions/${sessionId}/result`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(resultRes.body.answersMap["2"].correctAnswer).toBe("95");

    const analyticsRes = await request(app.getHttpServer())
      .get("/api/v1/exams/analytics?track=IELTS")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(analyticsRes.body.summary.totalCompleted).toBe(1);
    expect(analyticsRes.body.topWeakAreas[0].tag).toBe("Sentence Completion");

    const historyRes = await request(app.getHttpServer())
      .get("/api/v1/exams/history?track=IELTS")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(historyRes.body.items).toHaveLength(1);

    // 7. Start TEST mode session -> /check/:qn must return 403
    const testStart = await request(app.getHttpServer())
      .post("/api/v1/exams/sessions/start")
      .set("Authorization", `Bearer ${token}`)
      .send({ examId: EXAM_ID, mode: "TEST" })
      .expect(201);
    await request(app.getHttpServer())
      .get(`/api/v1/exams/sessions/${testStart.body.session.id}/check/1`)
      .set("Authorization", `Bearer ${token}`)
      .expect(403);

    // 8. Daily check-in awards +5 diamonds once per day
    const checkin1 = await request(app.getHttpServer())
      .post("/api/v1/streak/checkin")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(checkin1.body.diamondsEarned).toBe(5);

    const checkin2 = await request(app.getHttpServer())
      .post("/api/v1/streak/checkin")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(checkin2.body.diamondsEarned).toBe(0);
  });
});
