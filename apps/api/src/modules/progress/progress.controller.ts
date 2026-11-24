import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UnauthorizedException,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { examTrackSchema, type ExamTrack } from "@linguacraft/contracts";
import { ZodValidationPipe } from "../../core/http/zod-validation.pipe";
import type { AuthenticatedPrincipal } from "../../core/security/auth-context";
import { CurrentUser, Public } from "../../core/security/security.decorators";
import { ProgressService } from "./progress.service";

@ApiTags("Progress, Analytics, Streaks & Leaderboard")
@Controller({ version: "1" })
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  @ApiBearerAuth()
  @Get("exams/history")
  @ApiOperation({ summary: "Get paginated exam attempt history for current user" })
  async getExamHistory(
    @CurrentUser() principal: AuthenticatedPrincipal | null,
    @Query("track") track?: string,
    @Query("page") page?: string
  ) {
    if (!principal) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: "UNAUTHORIZED",
        message: "Authentication required",
      });
    }
    const parsedTrack: ExamTrack | undefined = track
      ? examTrackSchema.parse(track)
      : undefined;
    return this.progressService.getExamHistory(
      principal.userId,
      parsedTrack,
      page ? Number(page) : 1
    );
  }

  @ApiBearerAuth()
  @Get("exams/analytics")
  @ApiOperation({
    summary: "Compute IELTS/TOEIC score progression and top weak skill tags",
  })
  async getExamAnalytics(
    @CurrentUser() principal: AuthenticatedPrincipal | null,
    @Query("track", new ZodValidationPipe(examTrackSchema)) track: ExamTrack
  ) {
    if (!principal) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: "UNAUTHORIZED",
        message: "Authentication required",
      });
    }
    return this.progressService.getExamAnalytics(principal.userId, track);
  }

  @ApiBearerAuth()
  @Post("streak/checkin")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Perform idempotent daily streak check-in and earn diamonds" })
  async dailyCheckin(@CurrentUser() principal: AuthenticatedPrincipal | null) {
    if (!principal) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: "UNAUTHORIZED",
        message: "Authentication required",
      });
    }
    return this.progressService.dailyCheckin(principal.userId);
  }

  @Public()
  @Get("leaderboard/monthly")
  @ApiOperation({ summary: "Get cached monthly XP leaderboard" })
  async getMonthlyLeaderboard(@Query("month") month?: string) {
    return this.progressService.getMonthlyLeaderboard(month);
  }
}
