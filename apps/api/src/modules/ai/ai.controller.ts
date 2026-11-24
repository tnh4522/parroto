import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UnauthorizedException,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProperty,
  ApiPropertyOptional,
  ApiTags,
} from "@nestjs/swagger";
import {
  submitSpeechAssessmentRequestSchema,
  toeicExplainRequestSchema,
  transcribeFallbackRequestSchema,
  vocabExplainRequestSchema,
  type CefrLevel,
  type SpeechAssessmentMode,
  type SubmitSpeechAssessmentRequest,
  type ToeicExplainRequest,
  type VocabExplainRequest,
} from "@linguacraft/contracts";
import type { z } from "zod";
import { ZodValidationPipe } from "../../core/http/zod-validation.pipe";
import type { RequestWithTrace } from "../../core/observability/logger.service";
import type { AuthenticatedPrincipal } from "../../core/security/auth-context";
import {
  CurrentUser,
  RateLimit,
} from "../../core/security/security.decorators";
import { AiOrchestratorService } from "./ai-orchestrator.service";

class TranscribeFallbackSwaggerDto {
  @ApiProperty({ format: "uuid" })
  assetId!: string;

  @ApiProperty({ default: "en" })
  language!: string;
}

class SubmitSpeechAssessmentSwaggerDto {
  @ApiProperty({ format: "uuid" })
  assetId!: string;

  @ApiProperty({ enum: ["SHADOWING", "IELTS_SPEAKING", "TOEIC_SPEAKING"] })
  mode!: SpeechAssessmentMode;

  @ApiPropertyOptional({ default: "en" })
  language?: string;

  @ApiPropertyOptional()
  referenceText?: string;

  @ApiPropertyOptional({ enum: [1, 2, 3] })
  ieltsPart?: 1 | 2 | 3;

  @ApiPropertyOptional()
  promptQuestion?: string;
}

class VocabExplainSwaggerDto {
  @ApiProperty({ example: "resilient" })
  word!: string;

  @ApiPropertyOptional({ enum: ["A1", "A2", "B1", "B2", "C1", "C2"] })
  cefrLevel?: CefrLevel;

  @ApiPropertyOptional()
  contextSentence?: string;
}

class ToeicExplainSwaggerDto {
  @ApiProperty()
  transcript!: string;

  @ApiProperty()
  questionPrompt!: string;

  @ApiProperty({ type: [String] })
  options!: string[];

  @ApiProperty()
  correctAnswer!: string;
}

@ApiTags("AI Speech, IELTS/TOEIC Coaching & Vocabulary")
@ApiBearerAuth()
@Controller({ version: "1" })
export class AiController {
  constructor(private readonly aiOrchestrator: AiOrchestratorService) {}

  @RateLimit(10, 60, "audio-transcribe-fallback")
  @Post("audio/transcribe-fallback")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Run quota-guarded cloud STT fallback on an uploaded user audio asset",
  })
  async transcribeFallback(
    @CurrentUser() principal: AuthenticatedPrincipal | null,
    @Req() req: RequestWithTrace,
    @Body(new ZodValidationPipe(transcribeFallbackRequestSchema))
    body: TranscribeFallbackSwaggerDto
  ) {
    if (!principal) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: "UNAUTHORIZED",
        message: "Authentication required",
      });
    }
    const parsed = body as z.infer<typeof transcribeFallbackRequestSchema>;
    return this.aiOrchestrator.transcribeAssetWithFallback({
      userId: principal.userId,
      entitlementTier: principal.entitlementTier,
      assetId: parsed.assetId,
      language: parsed.language,
      traceId: req.traceId,
    });
  }

  @RateLimit(15, 60, "ai-speech-assess")
  @Post("ai/speech-assessments")
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary:
      "Queue asynchronous pronunciation alignment, stress/prosody check, or IELTS/TOEIC coaching",
  })
  async submitSpeechAssessment(
    @CurrentUser() principal: AuthenticatedPrincipal | null,
    @Req() req: RequestWithTrace,
    @Body(new ZodValidationPipe(submitSpeechAssessmentRequestSchema))
    body: SubmitSpeechAssessmentSwaggerDto
  ) {
    if (!principal) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: "UNAUTHORIZED",
        message: "Authentication required",
      });
    }
    return this.aiOrchestrator.enqueueSpeechAssessment({
      userId: principal.userId,
      entitlementTier: principal.entitlementTier,
      input: body as SubmitSpeechAssessmentRequest,
      traceId: req.traceId,
    });
  }

  @Get("ai/speech-assessments/:id")
  @ApiOperation({
    summary:
      "Fetch speech assessment result distinguishing acoustic metrics from LLM coaching",
  })
  async getSpeechAssessment(
    @CurrentUser() principal: AuthenticatedPrincipal | null,
    @Param("id", ParseUUIDPipe) assessmentId: string
  ) {
    if (!principal) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: "UNAUTHORIZED",
        message: "Authentication required",
      });
    }
    return this.aiOrchestrator.getSpeechAssessment(
      principal.userId,
      assessmentId
    );
  }

  @RateLimit(30, 60, "ai-vocab-explain")
  @Post("ai/vocabulary/explain")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Generate structured vocabulary nuances, collocations, and CEFR examples",
  })
  async explainVocabulary(
    @CurrentUser() principal: AuthenticatedPrincipal | null,
    @Req() req: RequestWithTrace,
    @Body(new ZodValidationPipe(vocabExplainRequestSchema))
    body: VocabExplainSwaggerDto
  ) {
    if (!principal) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: "UNAUTHORIZED",
        message: "Authentication required",
      });
    }
    return this.aiOrchestrator.explainVocabulary(
      principal.userId,
      principal.entitlementTier,
      body as VocabExplainRequest,
      req.traceId
    );
  }

  @RateLimit(20, 60, "ai-toeic-explain")
  @Post("ai/toeic/explain")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Generate structured TOEIC listening distractor analysis and vocabulary highlights",
  })
  async explainToeicQuestion(
    @CurrentUser() principal: AuthenticatedPrincipal | null,
    @Req() req: RequestWithTrace,
    @Body(new ZodValidationPipe(toeicExplainRequestSchema))
    body: ToeicExplainSwaggerDto
  ) {
    if (!principal) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: "UNAUTHORIZED",
        message: "Authentication required",
      });
    }
    return this.aiOrchestrator.explainToeicQuestion(
      principal.userId,
      principal.entitlementTier,
      body as ToeicExplainRequest,
      req.traceId
    );
  }
}
