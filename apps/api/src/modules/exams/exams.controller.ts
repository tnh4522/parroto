import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Put,
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
  examTrackSchema,
  saveExamAnswersRequestSchema,
  startExamSessionRequestSchema,
  type ExamMode,
  type ExamTrack,
  type StartExamSessionRequest,
} from "@linguacraft/contracts";
import type { z } from "zod";
import { ZodValidationPipe } from "../../core/http/zod-validation.pipe";
import type { AuthenticatedPrincipal } from "../../core/security/auth-context";
import {
  CurrentUser,
  OptionalAuth,
  Public,
} from "../../core/security/security.decorators";
import { ExamsService } from "./exams.service";

class StartExamSessionSwaggerDto {
  @ApiProperty({ format: "uuid" })
  examId!: string;

  @ApiProperty({ enum: ["TEST", "PRACTICE"] })
  mode!: ExamMode;

  @ApiPropertyOptional({ type: [Number] })
  parts?: number[];
}

class SaveExamAnswersSwaggerDto {
  @ApiProperty({
    type: "array",
    items: {
      type: "object",
      properties: {
        questionNumber: { type: "number" },
        selectedValue: { type: "string" },
        isFlagged: { type: "boolean" },
      },
    },
  })
  answers!: Array<{
    questionNumber: number;
    selectedValue: string;
    isFlagged?: boolean;
  }>;
}

@ApiTags("IELTS & TOEIC Exams")
@Controller({ path: "exams", version: "1" })
export class ExamsController {
  constructor(private readonly examsService: ExamsService) {}

  @Public()
  @Get("sets")
  @ApiOperation({ summary: "List exam sets by track (IELTS or TOEIC)" })
  async listSets(
    @Query("track", new ZodValidationPipe(examTrackSchema)) track: ExamTrack
  ) {
    return this.examsService.listExamSets(track);
  }

  @Public()
  @Get("sets/:setSlug")
  @ApiOperation({ summary: "Get exams inside an exam set (free-first order)" })
  async getSetDetail(@Param("setSlug") setSlug: string) {
    return this.examsService.getExamSetDetail(setSlug);
  }

  @ApiBearerAuth()
  @Post("sessions/start")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Start a timed TEST or interactive PRACTICE exam session" })
  async startSession(
    @CurrentUser() principal: AuthenticatedPrincipal | null,
    @Body(new ZodValidationPipe(startExamSessionRequestSchema))
    body: StartExamSessionSwaggerDto
  ) {
    if (!principal) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: "UNAUTHORIZED",
        message: "Authentication required",
      });
    }
    return this.examsService.startSession(
      principal.userId,
      principal.entitlementTier,
      body as StartExamSessionRequest
    );
  }

  @ApiBearerAuth()
  @Get("sessions/:id/questions")
  @ApiOperation({ summary: "Fetch questions and listening URLs for an active session" })
  async getSessionQuestions(
    @CurrentUser() principal: AuthenticatedPrincipal | null,
    @Param("id", ParseUUIDPipe) sessionId: string,
    @Query("part") part?: string
  ) {
    if (!principal) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: "UNAUTHORIZED",
        message: "Authentication required",
      });
    }
    return this.examsService.getSessionQuestions(
      principal.userId,
      sessionId,
      part ? Number(part) : undefined
    );
  }

  @ApiBearerAuth()
  @Put("sessions/:id/answers")
  @ApiOperation({ summary: "Batch upsert exam answers while IN_PROGRESS before deadline" })
  async saveAnswers(
    @CurrentUser() principal: AuthenticatedPrincipal | null,
    @Param("id", ParseUUIDPipe) sessionId: string,
    @Body(new ZodValidationPipe(saveExamAnswersRequestSchema))
    body: SaveExamAnswersSwaggerDto
  ) {
    if (!principal) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: "UNAUTHORIZED",
        message: "Authentication required",
      });
    }
    const parsed = body as z.infer<typeof saveExamAnswersRequestSchema>;
    return this.examsService.saveAnswers(
      principal.userId,
      sessionId,
      parsed.answers
    );
  }

  @ApiBearerAuth()
  @Get("sessions/:id/check/:qn")
  @ApiOperation({ summary: "Verify a single question inline (PRACTICE mode only)" })
  async checkPracticeQuestion(
    @CurrentUser() principal: AuthenticatedPrincipal | null,
    @Param("id", ParseUUIDPipe) sessionId: string,
    @Param("qn", ParseIntPipe) questionNumber: number
  ) {
    if (!principal) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: "UNAUTHORIZED",
        message: "Authentication required",
      });
    }
    return this.examsService.checkPracticeQuestion(
      principal.userId,
      sessionId,
      questionNumber
    );
  }

  @ApiBearerAuth()
  @Post("sessions/:id/submit")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Finalize and deterministically score an exam session" })
  async submitSession(
    @CurrentUser() principal: AuthenticatedPrincipal | null,
    @Param("id", ParseUUIDPipe) sessionId: string
  ) {
    if (!principal) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: "UNAUTHORIZED",
        message: "Authentication required",
      });
    }
    return this.examsService.submitSession(principal.userId, sessionId);
  }

  @ApiBearerAuth()
  @Post("sessions/:id/abandon")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Abandon an in-progress exam session" })
  async abandonSession(
    @CurrentUser() principal: AuthenticatedPrincipal | null,
    @Param("id", ParseUUIDPipe) sessionId: string
  ) {
    if (!principal) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: "UNAUTHORIZED",
        message: "Authentication required",
      });
    }
    return this.examsService.abandonSession(principal.userId, sessionId);
  }

  @ApiBearerAuth()
  @Get("sessions/:id/result")
  @ApiOperation({ summary: "View scored exam result with full answer explanations" })
  async getSessionResult(
    @CurrentUser() principal: AuthenticatedPrincipal | null,
    @Param("id", ParseUUIDPipe) sessionId: string
  ) {
    if (!principal) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: "UNAUTHORIZED",
        message: "Authentication required",
      });
    }
    return this.examsService.getSessionResult(principal.userId, sessionId);
  }

  @OptionalAuth()
  @Get(":slug")
  @ApiOperation({
    summary: "Get exam overview and parts metadata (never exposes audio URLs)",
  })
  async getExamOverview(
    @Param("slug") slug: string,
    @CurrentUser() principal: AuthenticatedPrincipal | null
  ) {
    return this.examsService.getExamOverview(slug, principal?.userId ?? null);
  }
}
