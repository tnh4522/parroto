import { createHash, randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  ieltsCoachingSchema,
  speechAssessmentResultSchema,
  toeicExplainResponseSchema,
  toeicSpeakingCoachingSchema,
  vocabExplainResponseSchema,
  type EntitlementTier,
  type SpeechAssessmentResult,
  type SubmitSpeechAssessmentRequest,
  type ToeicExplainRequest,
  type VocabExplainRequest,
} from "@linguacraft/contracts";
import { z, type ZodType, type ZodTypeDef } from "zod";
import { PrismaService } from "../../core/database/prisma.service";
import { QUEUE_NAMES, QueueService } from "../../core/queue/queue.service";
import { RedisService } from "../../core/redis/redis.service";
import { MediaService } from "../media/media.service";
import { LocalAiAdapter } from "./ai.adapters";
import { alignSpokenWordsToReference } from "./alignment.helper";
import {
  LLM_PROVIDER_TOKEN,
  MODERATION_PROVIDER_TOKEN,
  PRONUNCIATION_PROVIDER_TOKEN,
  STT_PROVIDER_TOKEN,
  type AcousticAssessmentOutput,
  type ILlmProvider,
  type IModerationProvider,
  type IPronunciationAssessmentProvider,
  type ISttProvider,
  type SttSegment,
} from "./ai.ports";
import { AzurePronunciationAdapter } from "./azure-pronunciation.adapter";
import { DeepgramSttAdapter } from "./deepgram-stt.adapter";
import { GeminiLlmAdapter } from "./gemini-llm.adapter";

export function scrubPii(input: string): string {
  return input
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[EMAIL_REDACTED]")
    .replace(/\+?\d[\d\s\-().]{7,}\d/g, "[PHONE_REDACTED]");
}

function sha256Hex(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

const coachingOutputSchema = z.object({
  disclaimer: z.string(),
  fluencyNotes: z.array(z.string()),
  intonationGuidance: z.array(z.string()),
  grammarCorrections: z.array(
    z.object({
      original: z.string(),
      suggested: z.string(),
      reason: z.string(),
    })
  ),
  ieltsCoaching: ieltsCoachingSchema.nullable(),
  toeicCoaching: toeicSpeakingCoachingSchema.nullable(),
});

@Injectable()
export class AiOrchestratorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly queue: QueueService,
    private readonly mediaService: MediaService,
    @Inject(STT_PROVIDER_TOKEN) private readonly sttProvider: ISttProvider,
    @Inject(LLM_PROVIDER_TOKEN) private readonly llmProvider: ILlmProvider,
    @Inject(MODERATION_PROVIDER_TOKEN)
    private readonly moderationProvider: IModerationProvider,
    @Inject(PRONUNCIATION_PROVIDER_TOKEN)
    private readonly pronunciationProvider: IPronunciationAssessmentProvider,
    private readonly azurePronunciation: AzurePronunciationAdapter,
    private readonly deepgramStt: DeepgramSttAdapter,
    private readonly geminiLlm: GeminiLlmAdapter,
    private readonly localAdapter: LocalAiAdapter
  ) {}

  private async isCircuitOpen(providerName: string): Promise<boolean> {
    const val = await this.redis.get(`cb:ai:open:${providerName}`);
    return val === "1";
  }

  private async recordProviderFailure(providerName: string): Promise<void> {
    const res = await this.redis.consumeRateLimit(
      `cb:ai:fail:${providerName}`,
      4,
      60
    );
    if (!res.allowed) {
      await this.redis.set(`cb:ai:open:${providerName}`, "1", 60);
    }
  }

  private async clearProviderFailure(providerName: string): Promise<void> {
    await this.redis.del(`cb:ai:open:${providerName}`);
  }

  async transcribeAssetWithFallback(params: {
    userId: string;
    entitlementTier: EntitlementTier;
    assetId: string;
    language: string;
    traceId?: string;
  }): Promise<{ text: string; segments: SttSegment[] }> {
    const dailyLimit = params.entitlementTier === "FREE" ? 5 : 100;
    const dateKey = new Date().toISOString().slice(0, 10);
    const quota = await this.redis.consumeRateLimit(
      `ai_quota:stt:${params.userId}:${dateKey}`,
      dailyLimit,
      24 * 60 * 60
    );

    if (!quota.allowed) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          code: "AI_QUOTA_EXCEEDED",
          message: "Daily cloud speech fallback quota exceeded",
        },
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    const stream = await this.mediaService.getSignedStreamUrl(params.assetId, {
      userId: params.userId,
      entitlementTier: params.entitlementTier,
    });

    const startedAt = Date.now();
    const traceId = params.traceId ?? randomUUID();

    try {
      const useDeepgram =
        this.deepgramStt.isConfigured() &&
        !(await this.isCircuitOpen("deepgram"));
      const activeStt = useDeepgram ? this.deepgramStt : this.sttProvider;

      const result = await activeStt.transcribe({
        mediaUrl: stream.signedUrl,
        language: params.language,
        wordTimestamps: true,
      });

      await this.prisma.aiAuditLog.create({
        data: {
          traceId,
          userId: params.userId,
          taskType: "stt_transcribe",
          provider: result.provider,
          model: result.model,
          inputSha256: sha256Hex(`${params.assetId}:${params.language}`),
          tokenInput: 0,
          tokenOutput: result.text.length,
          latencyMs: Math.max(1, Date.now() - startedAt),
          status: "SUCCESS",
        },
      });

      return {
        text: result.text,
        segments: result.segments,
      };
    } catch (err) {
      await this.prisma.aiAuditLog.create({
        data: {
          traceId,
          userId: params.userId,
          taskType: "stt_transcribe",
          provider: "stt_router",
          model: "unknown",
          inputSha256: sha256Hex(`${params.assetId}:${params.language}`),
          tokenInput: 0,
          tokenOutput: 0,
          latencyMs: Math.max(1, Date.now() - startedAt),
          status: "FAILED",
          errorCode: err instanceof Error ? err.name : "STT_FAILED",
        },
      });
      throw err;
    }
  }

  async enqueueSpeechAssessment(params: {
    userId: string;
    entitlementTier: EntitlementTier;
    input: SubmitSpeechAssessmentRequest;
    traceId?: string;
  }): Promise<{ assessmentId: string; status: "PENDING" }> {
    const asset = await this.prisma.mediaAsset.findUnique({
      where: { id: params.input.assetId },
    });
    if (!asset || asset.status !== "READY") {
      throw new NotFoundException({
        statusCode: 404,
        code: "MEDIA_NOT_READY",
        message: "Confirmed audio asset is required before assessment",
      });
    }
    if (asset.ownerId !== params.userId) {
      throw new ForbiddenException({
        statusCode: 403,
        code: "FORBIDDEN",
        message: "You do not own this audio recording",
      });
    }

    const dailyLimit = params.entitlementTier === "FREE" ? 15 : 120;
    const dateKey = new Date().toISOString().slice(0, 10);
    const quota = await this.redis.consumeRateLimit(
      `ai_quota:speech_assess:${params.userId}:${dateKey}`,
      dailyLimit,
      24 * 60 * 60
    );
    if (!quota.allowed) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          code: "AI_QUOTA_EXCEEDED",
          message: "Daily speech assessment quota exceeded",
        },
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    const assessmentId = randomUUID();
    await this.prisma.speechAssessment.create({
      data: {
        id: assessmentId,
        userId: params.userId,
        mediaAssetId: asset.id,
        mode: params.input.mode,
        status: "PENDING",
        referenceText: params.input.referenceText ?? null,
      },
    });

    await this.queue.enqueue(
      QUEUE_NAMES.SPEECH_ASSESSMENT,
      "assess-speech-recording",
      {
        assessmentId,
        userId: params.userId,
        entitlementTier: params.entitlementTier,
        assetId: asset.id,
        mode: params.input.mode,
        language: params.input.language,
        referenceText: params.input.referenceText,
        ieltsPart: params.input.ieltsPart,
        promptQuestion: params.input.promptQuestion,
        traceId: params.traceId,
      }
    );

    return { assessmentId, status: "PENDING" };
  }

  async processSpeechAssessmentJob(jobData: {
    assessmentId: string;
    userId: string;
    entitlementTier: EntitlementTier;
    assetId: string;
    mode: "SHADOWING" | "IELTS_SPEAKING" | "TOEIC_SPEAKING";
    language: string;
    referenceText?: string;
    ieltsPart?: 1 | 2 | 3;
    promptQuestion?: string;
    traceId?: string;
  }): Promise<SpeechAssessmentResult> {
    await this.prisma.speechAssessment.update({
      where: { id: jobData.assessmentId },
      data: { status: "PROCESSING" },
    });

    const stream = await this.mediaService.getSignedStreamUrl(jobData.assetId, {
      userId: jobData.userId,
      entitlementTier: jobData.entitlementTier,
    });

    let acoustic: AcousticAssessmentOutput | null = null;
    const startedAt = Date.now();
    const traceId = jobData.traceId ?? randomUUID();

    // 1. Acoustic tier selection: injected PronunciationProvider -> Azure -> Deepgram Word Alignment -> Local Word Alignment
    if (
      this.pronunciationProvider.isConfigured() &&
      !(await this.isCircuitOpen(this.pronunciationProvider.capabilities.providerName))
    ) {
      try {
        acoustic = await this.pronunciationProvider.assess({
          audioUrl: stream.signedUrl,
          language: jobData.language,
          mode: jobData.mode,
          referenceText: jobData.referenceText,
        });
        await this.clearProviderFailure(
          this.pronunciationProvider.capabilities.providerName
        );
      } catch {
        await this.recordProviderFailure(
          this.pronunciationProvider.capabilities.providerName
        );
        acoustic = null;
      }
    }

    if (!acoustic && this.azurePronunciation.isConfigured() && !(await this.isCircuitOpen("azure_speech"))) {
      try {
        acoustic = await this.azurePronunciation.assess({
          audioUrl: stream.signedUrl,
          language: jobData.language,
          mode: jobData.mode,
          referenceText: jobData.referenceText,
        });
        await this.clearProviderFailure("azure_speech");
      } catch {
        await this.recordProviderFailure("azure_speech");
        acoustic = null;
      }
    }

    if (!acoustic && this.deepgramStt.isConfigured() && !(await this.isCircuitOpen("deepgram"))) {
      try {
        const dg = await this.deepgramStt.transcribe({
          mediaUrl: stream.signedUrl,
          language: jobData.language,
          wordTimestamps: true,
        });
        const aligned = alignSpokenWordsToReference(
          jobData.referenceText,
          dg.words ?? [],
          dg.durationSec * 1000
        );
        acoustic = {
          provider: "deepgram",
          measurementTier: "FORCED_WORD_ALIGNED",
          transcript: dg.text,
          durationMs: dg.durationSec * 1000,
          wordsPerMinute: aligned.wordsPerMinute,
          accuracyScore: aligned.accuracyScore,
          fluencyScore: aligned.fluencyScore,
          completenessScore: aligned.completenessScore,
          prosody: null,
          words: aligned.words,
        };
      } catch {
        await this.recordProviderFailure("deepgram");
        acoustic = null;
      }
    }

    if (!acoustic) {
      acoustic = await this.localAdapter.assess({
        audioUrl: stream.signedUrl,
        language: jobData.language,
        mode: jobData.mode,
        referenceText: jobData.referenceText,
      });
    }

    // Strict honesty invariant: strip phonemes & prosody if tier is not ACOUSTIC_PHONEME_ALIGNED
    if (acoustic.measurementTier !== "ACOUSTIC_PHONEME_ALIGNED") {
      acoustic = {
        ...acoustic,
        prosody: null,
        words: acoustic.words.map((w) => ({ ...w, phonemes: null })),
      };
    }

    await this.prisma.aiAuditLog.create({
      data: {
        traceId,
        userId: jobData.userId,
        taskType: "speech_acoustic_assessment",
        provider: acoustic.provider,
        model: acoustic.measurementTier,
        inputSha256: sha256Hex(`${jobData.assetId}:${jobData.mode}`),
        tokenInput: 0,
        tokenOutput: acoustic.transcript.length,
        latencyMs: Math.max(1, Date.now() - startedAt),
        status: "SUCCESS",
      },
    });

    // 2. Pedagogical Coaching Layer (strictly separated from acoustic metrics)
    const coaching = await this.generateStructuredWithAudit({
      userId: jobData.userId,
      taskType: "speech_llm_coaching",
      promptKey: "speech_coaching_v1",
      promptVersion: "v1",
      schema: coachingOutputSchema,
      variables: {
        mode: jobData.mode,
        transcript: acoustic.transcript,
        referenceText: jobData.referenceText ?? null,
        wordsPerMinute: acoustic.wordsPerMinute,
        ieltsPart: jobData.ieltsPart ?? null,
        promptQuestion: jobData.promptQuestion ?? null,
      },
      traceId,
    });

    const completedAt = new Date();
    const record = await this.prisma.speechAssessment.findUnique({
      where: { id: jobData.assessmentId },
    });

    const payload: SpeechAssessmentResult = speechAssessmentResultSchema.parse({
      assessmentId: jobData.assessmentId,
      schemaVersion: "1.0",
      status: "COMPLETED",
      mode: jobData.mode,
      measurementTier: acoustic.measurementTier,
      providers: {
        acousticProvider: acoustic.provider,
        coachProvider: this.geminiLlm.isConfigured()
          ? "gemini-3.8-flash"
          : "local_rule_llm",
      },
      transcript: acoustic.transcript,
      referenceText: jobData.referenceText ?? null,
      acousticMetrics: {
        durationMs: acoustic.durationMs,
        wordsPerMinute: acoustic.wordsPerMinute,
        accuracyScore: acoustic.accuracyScore,
        fluencyScore: acoustic.fluencyScore,
        completenessScore: acoustic.completenessScore,
        prosody: acoustic.prosody,
        words: acoustic.words,
      },
      llmCoachingFeedback: coaching,
      audioDeleted: Boolean(record?.audioDeletedAt),
      errorCode: null,
      createdAt: (record?.createdAt ?? completedAt).toISOString(),
      completedAt: completedAt.toISOString(),
    });

    await this.prisma.speechAssessment.update({
      where: { id: jobData.assessmentId },
      data: {
        status: "COMPLETED",
        measurementTier: acoustic.measurementTier,
        acousticProvider: acoustic.provider,
        coachProvider: payload.providers?.coachProvider ?? null,
        transcript: acoustic.transcript,
        resultJson: payload as unknown as Prisma.InputJsonValue,
        completedAt,
      },
    });

    return payload;
  }

  async getSpeechAssessment(
    userId: string,
    assessmentId: string
  ): Promise<SpeechAssessmentResult> {
    const row = await this.prisma.speechAssessment.findUnique({
      where: { id: assessmentId },
    });
    if (!row) {
      throw new NotFoundException({
        statusCode: 404,
        code: "ASSESSMENT_NOT_FOUND",
        message: "Speech assessment not found",
      });
    }
    if (row.userId !== userId) {
      throw new ForbiddenException({
        statusCode: 403,
        code: "FORBIDDEN",
        message: "You do not own this speech assessment",
      });
    }

    if (row.resultJson) {
      const parsed = speechAssessmentResultSchema.parse({
        ...(row.resultJson as Record<string, unknown>),
        audioDeleted: Boolean(row.audioDeletedAt) || row.mediaAssetId === null,
      });
      return parsed;
    }

    return speechAssessmentResultSchema.parse({
      assessmentId: row.id,
      schemaVersion: "1.0",
      status: row.status,
      mode: row.mode,
      measurementTier: row.measurementTier ?? null,
      providers: null,
      transcript: row.transcript ?? null,
      referenceText: row.referenceText ?? null,
      acousticMetrics: null,
      llmCoachingFeedback: null,
      audioDeleted: Boolean(row.audioDeletedAt) || row.mediaAssetId === null,
      errorCode: row.errorCode ?? null,
      createdAt: row.createdAt.toISOString(),
      completedAt: row.completedAt?.toISOString() ?? null,
    });
  }

  async explainVocabulary(
    userId: string,
    tier: EntitlementTier,
    input: VocabExplainRequest,
    traceId?: string
  ) {
    const normalizedWord = input.word.trim().toLowerCase();
    const cacheKey = `ai:vocab_explain:${normalizedWord}:${input.cefrLevel}:${sha256Hex(
      input.contextSentence ?? ""
    ).slice(0, 12)}`;
    const cached = await this.redis.getJson(cacheKey);
    if (cached) return cached;

    const dailyLimit = tier === "FREE" ? 15 : 200;
    const quota = await this.redis.consumeRateLimit(
      `ai_quota:vocab_explain:${userId}:${new Date().toISOString().slice(0, 10)}`,
      dailyLimit,
      24 * 60 * 60
    );
    if (!quota.allowed) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          code: "AI_QUOTA_EXCEEDED",
          message: "Daily vocabulary AI explanation quota exceeded",
        },
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    const explained = await this.generateStructuredWithAudit({
      userId,
      taskType: "vocab_explain",
      promptKey: "vocab_explain_v1",
      promptVersion: "v1",
      schema: vocabExplainResponseSchema,
      variables: {
        word: normalizedWord,
        cefrLevel: input.cefrLevel,
        contextSentence: input.contextSentence ?? "",
      },
      traceId,
    });

    await this.redis.setJson(cacheKey, explained, 7 * 24 * 60 * 60);
    return explained;
  }

  async explainToeicQuestion(
    userId: string,
    tier: EntitlementTier,
    input: ToeicExplainRequest,
    traceId?: string
  ) {
    const cacheKey = `ai:toeic_explain:${sha256Hex(JSON.stringify(input)).slice(0, 24)}`;
    const cached = await this.redis.getJson(cacheKey);
    if (cached) return cached;

    const dailyLimit = tier === "FREE" ? 10 : 150;
    const quota = await this.redis.consumeRateLimit(
      `ai_quota:toeic_explain:${userId}:${new Date().toISOString().slice(0, 10)}`,
      dailyLimit,
      24 * 60 * 60
    );
    if (!quota.allowed) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          code: "AI_QUOTA_EXCEEDED",
          message: "Daily TOEIC explanation quota exceeded",
        },
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    const explained = await this.generateStructuredWithAudit({
      userId,
      taskType: "toeic_explain",
      promptKey: "toeic_explain_v1",
      promptVersion: "v1",
      schema: toeicExplainResponseSchema,
      variables: {
        transcript: input.transcript,
        questionPrompt: input.questionPrompt,
        options: input.options,
        correctAnswer: input.correctAnswer,
      },
      traceId,
    });

    await this.redis.setJson(cacheKey, explained, 7 * 24 * 60 * 60);
    return explained;
  }

  async generateStructuredWithAudit<TOutput>(params: {
    userId?: string;
    taskType: string;
    promptKey: string;
    promptVersion: string;
    schema: ZodType<TOutput, ZodTypeDef, unknown>;
    variables: Record<string, unknown>;
    traceId?: string;
  }): Promise<TOutput> {
    const sanitizedVariables: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(params.variables)) {
      sanitizedVariables[key] =
        typeof value === "string" ? scrubPii(value) : value;
    }

    const startedAt = Date.now();
    const traceId = params.traceId ?? randomUUID();
    const inputHash = sha256Hex(
      `${params.promptKey}:${params.promptVersion}:${JSON.stringify(sanitizedVariables)}`
    );

    const canUseGemini =
      this.geminiLlm.isConfigured() && !(await this.isCircuitOpen("gemini"));
    let res: {
      provider: string;
      model: string;
      data: TOutput;
      usage: { inputTokens: number; outputTokens: number };
    };

    if (canUseGemini) {
      try {
        res = await this.geminiLlm.generateStructured({
          promptKey: params.promptKey,
          promptVersion: params.promptVersion,
          schema: params.schema,
          variables: sanitizedVariables,
        });
        await this.clearProviderFailure("gemini");
      } catch {
        await this.recordProviderFailure("gemini");
        res = await this.llmProvider.generateStructured({
          promptKey: params.promptKey,
          promptVersion: params.promptVersion,
          schema: params.schema,
          variables: sanitizedVariables,
        });
      }
    } else {
      res = await this.llmProvider.generateStructured({
        promptKey: params.promptKey,
        promptVersion: params.promptVersion,
        schema: params.schema,
        variables: sanitizedVariables,
      });
    }

    await this.prisma.aiAuditLog.create({
      data: {
        traceId,
        userId: params.userId ?? null,
        taskType: params.taskType,
        provider: res.provider,
        model: res.model,
        promptVersion: params.promptVersion,
        inputSha256: inputHash,
        tokenInput: res.usage.inputTokens,
        tokenOutput: res.usage.outputTokens,
        latencyMs: Math.max(1, Date.now() - startedAt),
        status: "SUCCESS",
      },
    });

    return res.data;
  }

  async moderateText(params: {
    userId: string;
    text: string;
    traceId?: string;
  }): Promise<{ flagged: boolean; categories: string[] }> {
    const cleaned = scrubPii(params.text);
    const startedAt = Date.now();
    const res = await this.moderationProvider.classifyText(cleaned);

    await this.prisma.aiAuditLog.create({
      data: {
        traceId: params.traceId ?? randomUUID(),
        userId: params.userId,
        taskType: "moderation",
        provider: res.provider,
        model: res.model,
        inputSha256: sha256Hex(cleaned),
        tokenInput: cleaned.length,
        tokenOutput: 1,
        latencyMs: Math.max(1, Date.now() - startedAt),
        status: "SUCCESS",
      },
    });

    return {
      flagged: res.flagged,
      categories: res.categories,
    };
  }
}
