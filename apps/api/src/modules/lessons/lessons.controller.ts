import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
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
  cefrLevelSchema,
  importYoutubeLessonRequestSchema,
  sentenceAttemptRequestSchema,
  type CefrLevel,
  type SentenceAttemptRequest,
} from "@linguacraft/contracts";
import { z } from "zod";
import { ZodValidationPipe } from "../../core/http/zod-validation.pipe";
import type { AuthenticatedPrincipal } from "../../core/security/auth-context";
import {
  CurrentUser,
  OptionalAuth,
  Public,
  RateLimit,
  RequireEntitlement,
} from "../../core/security/security.decorators";
import { LessonsService } from "./lessons.service";

const lessonListQuerySchema = z.object({
  topic: z.string().optional(),
  level: cefrLevelSchema.optional(),
  mode: z.enum(["DICTATION", "SHADOWING"]).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

class SentenceAttemptSwaggerDto {
  @ApiProperty({ format: "uuid" })
  sentenceId!: string;

  @ApiProperty({ enum: ["DICTATION", "SHADOWING"] })
  mode!: "DICTATION" | "SHADOWING";

  @ApiProperty({ minimum: 0, maximum: 100 })
  accuracyScore!: number;

  @ApiPropertyOptional({ default: 0 })
  mistakesCount!: number;

  @ApiPropertyOptional({ default: 0 })
  replayCount!: number;
}

class ImportYoutubeSwaggerDto {
  @ApiProperty({ example: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" })
  youtubeUrl!: string;

  @ApiPropertyOptional({ type: [String] })
  topicIds?: string[];
}

@ApiTags("Lessons, Dictation, Shadowing, Grammar & Stories")
@Controller({ version: "1" })
export class LessonsController {
  constructor(private readonly lessonsService: LessonsService) {}

  @Public()
  @Get("lessons")
  @ApiOperation({ summary: "List filtered lessons with pagination" })
  async listLessons(
    @Query(new ZodValidationPipe(lessonListQuerySchema))
    query: z.infer<typeof lessonListQuerySchema>
  ) {
    return this.lessonsService.listLessons({
      topic: query.topic,
      level: query.level,
      page: query.page,
      limit: query.limit,
    });
  }

  @Public()
  @Get("lessons/daily")
  @ApiOperation({ summary: "Get today's featured lessons" })
  async getDailyLessons() {
    return this.lessonsService.getDailyLessons();
  }

  @OptionalAuth()
  @Get("lessons/:slug")
  @ApiOperation({
    summary:
      "Get lesson details with signed media and transcript cues (redacted if Pro-locked)",
  })
  async getLessonDetail(
    @Param("slug") slug: string,
    @CurrentUser() principal: AuthenticatedPrincipal | null
  ) {
    return this.lessonsService.getLessonDetail(
      slug,
      principal
        ? {
            userId: principal.userId,
            entitlementTier: principal.entitlementTier,
          }
        : null
    );
  }

  @ApiBearerAuth()
  @RateLimit(60, 60, "lesson-attempts")
  @Post("lessons/:lessonId/attempts")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Submit a sentence attempt for Dictation or Shadowing and credit idempotent XP/Diamonds",
  })
  async submitAttempt(
    @CurrentUser() principal: AuthenticatedPrincipal | null,
    @Param("lessonId", ParseUUIDPipe) lessonId: string,
    @Body(new ZodValidationPipe(sentenceAttemptRequestSchema))
    body: SentenceAttemptSwaggerDto
  ) {
    if (!principal) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: "UNAUTHORIZED",
        message: "Authentication required",
      });
    }
    return this.lessonsService.submitAttempt(
      principal.userId,
      lessonId,
      body as SentenceAttemptRequest
    );
  }

  @ApiBearerAuth()
  @RequireEntitlement("PRO")
  @RateLimit(5, 3600, "youtube-import")
  @Post("lessons/import-youtube")
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: "Queue asynchronous YouTube lesson ingestion & AI transcription (PRO required)",
  })
  async importYoutube(
    @CurrentUser() principal: AuthenticatedPrincipal | null,
    @Body(new ZodValidationPipe(importYoutubeLessonRequestSchema))
    body: ImportYoutubeSwaggerDto
  ) {
    if (!principal) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: "UNAUTHORIZED",
        message: "Authentication required",
      });
    }
    const parsed = body as z.infer<typeof importYoutubeLessonRequestSchema>;
    return this.lessonsService.queueYoutubeImport(
      principal.userId,
      parsed.youtubeUrl,
      parsed.topicIds
    );
  }

  @Public()
  @Get("grammar")
  @ApiOperation({ summary: "List public grammar syllabus filtered optionally by CEFR level" })
  async listGrammar(@Query("level") level?: string) {
    const parsedLevel: CefrLevel | undefined = level
      ? cefrLevelSchema.parse(level)
      : undefined;
    return this.lessonsService.listGrammar(parsedLevel);
  }

  @Public()
  @Get("stories")
  @ApiOperation({ summary: "List graded interactive stories" })
  async listStories(
    @Query("level") level?: string,
    @Query("collection") collection?: string,
    @Query("page") page?: string
  ) {
    const parsedLevel: CefrLevel | undefined = level
      ? cefrLevelSchema.parse(level)
      : undefined;
    return this.lessonsService.listStories({
      level: parsedLevel,
      collection,
      page: page ? Number(page) : 1,
    });
  }

  @OptionalAuth()
  @Get("stories/:slug")
  @ApiOperation({ summary: "Get interactive story scenes and signed audio URL" })
  async getStoryDetail(
    @Param("slug") slug: string,
    @CurrentUser() principal: AuthenticatedPrincipal | null
  ) {
    return this.lessonsService.getStoryDetail(
      slug,
      principal ? { entitlementTier: principal.entitlementTier } : null
    );
  }
}
