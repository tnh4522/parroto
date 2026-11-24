import { randomUUID } from "node:crypto";
import type { INestApplication } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { configureApp } from "../../app.bootstrap";
import { AppModule } from "../../app.module";
import { getAppEnv } from "../../core/config/env";
import { PrismaService } from "../../core/database/prisma.service";
import { QueueService } from "../../core/queue/queue.service";
import { StorageService } from "../../core/storage/storage.service";
import { alignSpokenWordsToReference } from "./alignment.helper";
import { AiOrchestratorService } from "./ai-orchestrator.service";
import { PRONUNCIATION_PROVIDER_TOKEN } from "./ai.ports";

const USER_ID = randomUUID();

interface InMemoryAssessment {
  id: string;
  userId: string;
  mediaAssetId: string | null;
  mode: string;
  status: string;
  measurementTier: string | null;
  acousticProvider: string | null;
  coachProvider: string | null;
  referenceText: string | null;
  transcript: string | null;
  resultJson: unknown;
  errorCode: string | null;
  audioDeletedAt: Date | null;
  createdAt: Date;
  completedAt: Date | null;
}

describe("AI Service Layer, Consent & Deletion (/api/v1/ai, /api/v1/media)", () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let queueService: QueueService;
  let aiOrchestrator: AiOrchestratorService;

  let userConsentAt: Date | null = null;
  const mediaAssets = new Map<string, Record<string, unknown>>();
  const assessments = new Map<string, InMemoryAssessment>();
  const auditLogs: Array<Record<string, unknown>> = [];

  const fakeStorage = {
    bucket: "linguacraft-test",
    createPresignedPutUrl: vi.fn(async ({ objectKey }: { objectKey: string }) => ({
      uploadUrl: `https://s3.example.test/${objectKey}?sig=put`,
      expiresAt: new Date(Date.now() + 600_000).toISOString(),
    })),
    createPresignedGetUrl: vi.fn(async (objectKey: string) => ({
      signedUrl: `https://s3.example.test/${objectKey}?sig=get`,
      expiresAt: new Date(Date.now() + 900_000).toISOString(),
    })),
    headObject: vi.fn(async () => ({
      exists: true,
      contentLength: 24000,
      contentType: "audio/webm",
    })),
    deleteObject: vi.fn(async () => {}),
  };

  // Simulated failing Azure-grade pronunciation provider to test circuit fallback
  const failingAcousticProvider = {
    capabilities: {
      providerName: "azure_speech",
      supportsPhonemes: true,
      supportsProsody: true,
    },
    isConfigured: () => true,
    assess: vi.fn(async () => {
      throw new Error("AZURE_SPEECH_TIMEOUT");
    }),
  };

  const delegates = {
    user: {
      findUnique: async ({ where }: { where: { id: string } }) => ({
        id: where.id,
        email: "learner@example.test",
        role: "USER",
        status: "ACTIVE",
        ageVerifiedAt: new Date(),
        audioConsentAt: userConsentAt,
        entitlements: [],
      }),
      update: async ({
        data,
      }: {
        where: { id: string };
        data: { audioConsentAt?: Date; audioConsentVersion?: string };
      }) => {
        if (data.audioConsentAt) userConsentAt = data.audioConsentAt;
        return { id: USER_ID, audioConsentAt: userConsentAt };
      },
    },
    mediaAsset: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        mediaAssets.set(String(data.id), data);
        return data;
      },
      findUnique: async ({ where }: { where: { id: string } }) =>
        mediaAssets.get(where.id) ?? null,
      update: async ({
        where,
        data,
      }: {
        where: { id: string };
        data: Record<string, unknown>;
      }) => {
        const existing = mediaAssets.get(where.id);
        if (!existing) throw { code: "P2025" };
        const updated = { ...existing, ...data };
        mediaAssets.set(where.id, updated);
        return updated;
      },
      delete: async ({ where }: { where: { id: string } }) => {
        mediaAssets.delete(where.id);
        return { id: where.id };
      },
    },
    speechAssessment: {
      create: async ({ data }: { data: Partial<InMemoryAssessment> }) => {
        const row: InMemoryAssessment = {
          id: data.id!,
          userId: data.userId!,
          mediaAssetId: data.mediaAssetId ?? null,
          mode: data.mode!,
          status: data.status ?? "PENDING",
          measurementTier: null,
          acousticProvider: null,
          coachProvider: null,
          referenceText: data.referenceText ?? null,
          transcript: null,
          resultJson: null,
          errorCode: null,
          audioDeletedAt: null,
          createdAt: new Date(),
          completedAt: null,
        };
        assessments.set(row.id, row);
        return row;
      },
      findUnique: async ({ where }: { where: { id: string } }) =>
        assessments.get(where.id) ?? null,
      update: async ({
        where,
        data,
      }: {
        where: { id: string };
        data: Partial<InMemoryAssessment>;
      }) => {
        const existing = assessments.get(where.id);
        if (!existing) throw { code: "P2025" };
        const updated = { ...existing, ...data };
        assessments.set(where.id, updated);
        return updated;
      },
      updateMany: async ({
        where,
        data,
      }: {
        where: { mediaAssetId: string };
        data: Partial<InMemoryAssessment>;
      }) => {
        for (const [k, row] of assessments.entries()) {
          if (row.mediaAssetId === where.mediaAssetId) {
            assessments.set(k, { ...row, ...data });
          }
        }
        return { count: 1 };
      },
    },
    aiAuditLog: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        auditLogs.push(data);
        return data;
      },
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
      .overrideProvider(StorageService)
      .useValue(fakeStorage)
      .overrideProvider(PRONUNCIATION_PROVIDER_TOKEN)
      .useValue(failingAcousticProvider)
      .compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    jwtService = moduleRef.get(JwtService);
    queueService = moduleRef.get(QueueService);
    aiOrchestrator = moduleRef.get(AiOrchestratorService);
  });

  beforeEach(() => {
    userConsentAt = null;
    mediaAssets.clear();
    assessments.clear();
    auditLogs.length = 0;
    queueService.memoryJobs.length = 0;
    fakeStorage.deleteObject.mockClear();
  });

  afterAll(async () => {
    await app.close();
  });

  it("aligns spoken words to reference transcript without fabricating phonemes", () => {
    const aligned = alignSpokenWordsToReference(
      "We need clean water today",
      [
        { word: "We", startMs: 0, endMs: 200, confidence: 0.95 },
        { word: "need", startMs: 200, endMs: 450, confidence: 0.92 },
        { word: "fresh", startMs: 450, endMs: 800, confidence: 0.85 },
        { word: "water", startMs: 800, endMs: 1200, confidence: 0.94 },
        { word: "today", startMs: 1200, endMs: 1600, confidence: 0.96 },
      ],
      2000
    );

    expect(aligned.wordsPerMinute).toBe(150);
    expect(aligned.words[2]?.errorType).toBe("MISPRONUNCIATION");
    expect(aligned.words.every((w) => w.phonemes === null)).toBe(true);
  });

  it("enforces consent, falls back honestly without fake phonemes, evaluates IELTS Speaking, and supports recording deletion", async () => {
    const token = await jwtService.signAsync(
      { sub: USER_ID, email: "learner@example.test", role: "USER" },
      { secret: getAppEnv().JWT_ACCESS_SECRET }
    );

    // 1. Presign rejected until explicit consent is recorded
    const deniedPresign = await request(app.getHttpServer())
      .post("/api/v1/media/presign-upload")
      .set("Authorization", `Bearer ${token}`)
      .send({
        purpose: "SPEAKING_CLIP",
        mimeType: "audio/webm",
        contentLength: 24000,
      })
      .expect(403);
    expect(deniedPresign.body.code).toBe("AUDIO_CONSENT_REQUIRED");

    // 2. Grant audio consent
    await request(app.getHttpServer())
      .post("/api/v1/users/me/audio-consent")
      .set("Authorization", `Bearer ${token}`)
      .send({ accepted: true, policyVersion: "2026-11" })
      .expect(200);

    // 3. Presign & confirm audio asset
    const presignRes = await request(app.getHttpServer())
      .post("/api/v1/media/presign-upload")
      .set("Authorization", `Bearer ${token}`)
      .send({
        purpose: "SPEAKING_CLIP",
        mimeType: "audio/webm",
        contentLength: 24000,
      })
      .expect(200);
    const assetId = presignRes.body.assetId as string;

    await request(app.getHttpServer())
      .post(`/api/v1/media/${assetId}/confirm`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    // 4. Queue IELTS Speaking assessment -> 202 Accepted
    const enqueueRes = await request(app.getHttpServer())
      .post("/api/v1/ai/speech-assessments")
      .set("Authorization", `Bearer ${token}`)
      .send({
        assetId,
        mode: "IELTS_SPEAKING",
        language: "en",
        ieltsPart: 2,
        promptQuestion: "Describe a memorable journey.",
      })
      .expect(202);
    const assessmentId = enqueueRes.body.assessmentId as string;
    expect(queueService.memoryJobs[0]?.queueName).toBe("speech-assessment");

    // 5. Simulate BullMQ worker execution with falling-back acoustic provider
    await aiOrchestrator.processSpeechAssessmentJob(
      queueService.memoryJobs[0]!.data as Parameters<
        AiOrchestratorService["processSpeechAssessmentJob"]
      >[0]
    );

    // 6. Retrieve persisted assessment: separates acoustic facts from LLM coaching & omits fake phonemes/prosody
    const resultRes = await request(app.getHttpServer())
      .get(`/api/v1/ai/speech-assessments/${assessmentId}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(resultRes.body.status).toBe("COMPLETED");
    expect(resultRes.body.measurementTier).toBe("TRANSCRIPT_COMPARISON_ONLY");
    expect(resultRes.body.acousticMetrics.prosody).toBeNull();
    expect(
      resultRes.body.acousticMetrics.words.every(
        (w: { phonemes: unknown }) => w.phonemes === null
      )
    ).toBe(true);
    expect(resultRes.body.llmCoachingFeedback.ieltsCoaching.isOfficialScore).toBe(
      false
    );

    // 7. Delete recording removes S3 object & marks audioDeleted = true on assessment
    const delRes = await request(app.getHttpServer())
      .delete(`/api/v1/media/${assetId}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(delRes.body.deleted).toBe(true);
    expect(fakeStorage.deleteObject).toHaveBeenCalledTimes(1);

    const postDeleteAssessment = await request(app.getHttpServer())
      .get(`/api/v1/ai/speech-assessments/${assessmentId}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(postDeleteAssessment.body.audioDeleted).toBe(true);

    // 8. Structured Vocabulary Explanation & TOEIC Explanation endpoints
    const vocabRes = await request(app.getHttpServer())
      .post("/api/v1/ai/vocabulary/explain")
      .set("Authorization", `Bearer ${token}`)
      .send({ word: "mitigate", cefrLevel: "B2" })
      .expect(200);
    expect(vocabRes.body.collocations.length).toBeGreaterThan(0);

    const toeicRes = await request(app.getHttpServer())
      .post("/api/v1/ai/toeic/explain")
      .set("Authorization", `Bearer ${token}`)
      .send({
        transcript: "The budget meeting has been moved to Thursday at 2 PM.",
        questionPrompt: "When will the budget meeting take place?",
        options: ["A. Tuesday", "B. Wednesday", "C. Thursday", "D. Friday"],
        correctAnswer: "C. Thursday",
      })
      .expect(200);
    expect(toeicRes.body.distractorBreakdown.length).toBe(3);
  });
});
