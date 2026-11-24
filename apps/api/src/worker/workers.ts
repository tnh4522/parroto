import type { INestApplicationContext } from "@nestjs/common";
import { cefrLevelSchema } from "@linguacraft/contracts";
import { Worker } from "bullmq";
import { z } from "zod";
import { getAppEnv } from "../core/config/env";
import { PrismaService } from "../core/database/prisma.service";
import { appLogger } from "../core/observability/logger.service";
import { QUEUE_NAMES, QueueService } from "../core/queue/queue.service";
import { AiOrchestratorService } from "../modules/ai/ai-orchestrator.service";
import { ExamsService } from "../modules/exams/exams.service";

const lessonEnrichmentSchema = z.object({
  cefrLevel: cefrLevelSchema,
  topics: z.array(z.string()),
  sentences: z.array(
    z.object({
      startMs: z.number().int().nonnegative(),
      endMs: z.number().int().nonnegative(),
      text: z.string(),
      translations: z.record(z.string(), z.string()),
    })
  ),
});

export async function processMediaIngestionJob(
  queueService: QueueService,
  data: { lessonId: string; userId: string; videoId: string; youtubeUrl: string }
) {
  await queueService.enqueue(QUEUE_NAMES.AI_TRANSCRIPTION, "transcribe-lesson", {
    lessonId: data.lessonId,
    userId: data.userId,
    sourceUrl: data.youtubeUrl,
  });
}

export async function processAiTranscriptionJob(
  prisma: PrismaService,
  ai: AiOrchestratorService,
  data: { lessonId: string; userId: string; sourceUrl: string }
) {
  const enriched = await ai.generateStructuredWithAudit({
    userId: data.userId,
    taskType: "lesson_enrich",
    promptKey: "lesson_enrich_v1",
    promptVersion: "v1",
    schema: lessonEnrichmentSchema,
    variables: {
      rawText: `Imported lesson content ready for practice (${data.sourceUrl}).`,
    },
  });

  await prisma.$transaction(async (tx) => {
    await tx.lessonSentence.deleteMany({ where: { lessonId: data.lessonId } });
    for (const [idx, s] of enriched.sentences.entries()) {
      await tx.lessonSentence.create({
        data: {
          lessonId: data.lessonId,
          orderIndex: idx,
          startMs: s.startMs,
          endMs: s.endMs,
          text: s.text,
          translationsJson: s.translations,
        },
      });
    }
    await tx.lesson.update({
      where: { id: data.lessonId },
      data: { cefrLevel: enriched.cefrLevel, status: "READY" },
    });
  });
}

export async function processExamExpirationSweep(
  prisma: PrismaService,
  examsService: ExamsService
): Promise<number> {
  const cutoff = new Date(Date.now() - 5000);
  const expired = await prisma.examSession.findMany({
    where: {
      status: "IN_PROGRESS",
      mode: "TEST",
      deadlineAt: { lt: cutoff },
    },
    select: { id: true, userId: true },
    take: 50,
  });

  let submitted = 0;
  for (const session of expired) {
    try {
      await examsService.submitSession(session.userId, session.id);
      submitted += 1;
    } catch (err) {
      appLogger.warn(
        { sessionId: session.id, err },
        "Skipped expired exam auto-submit"
      );
    }
  }
  return submitted;
}

export function startBackgroundWorkers(appCtx: INestApplicationContext): Worker[] {
  const env = getAppEnv();
  const connection = { url: env.REDIS_URL };

  const prisma = appCtx.get(PrismaService);
  const queueService = appCtx.get(QueueService);
  const ai = appCtx.get(AiOrchestratorService);
  const examsService = appCtx.get(ExamsService);

  const mediaWorker = new Worker(
    QUEUE_NAMES.MEDIA_INGESTION,
    async (job) => {
      await processMediaIngestionJob(
        queueService,
        job.data as {
          lessonId: string;
          userId: string;
          videoId: string;
          youtubeUrl: string;
        }
      );
    },
    { connection }
  );

  const transcriptionWorker = new Worker(
    QUEUE_NAMES.AI_TRANSCRIPTION,
    async (job) => {
      await processAiTranscriptionJob(
        prisma,
        ai,
        job.data as { lessonId: string; userId: string; sourceUrl: string }
      );
    },
    { connection }
  );

  const examMaintenanceWorker = new Worker(
    QUEUE_NAMES.EXAM_MAINTENANCE,
    async () => {
      await processExamExpirationSweep(prisma, examsService);
    },
    { connection }
  );

  const speechAssessmentWorker = new Worker(
    QUEUE_NAMES.SPEECH_ASSESSMENT,
    async (job) => {
      await ai.processSpeechAssessmentJob(
        job.data as Parameters<typeof ai.processSpeechAssessmentJob>[0]
      );
    },
    { connection }
  );

  return [
    mediaWorker,
    transcriptionWorker,
    examMaintenanceWorker,
    speechAssessmentWorker,
  ];
}
