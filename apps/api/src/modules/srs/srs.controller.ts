import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UnauthorizedException,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProperty,
  ApiTags,
} from "@nestjs/swagger";
import {
  srsReviewRequestSchema,
  type SrsRating,
  type SrsReviewRequest,
} from "@linguacraft/contracts";
import { ZodValidationPipe } from "../../core/http/zod-validation.pipe";
import type { AuthenticatedPrincipal } from "../../core/security/auth-context";
import { CurrentUser } from "../../core/security/security.decorators";
import { SrsService } from "./srs.service";

class SrsReviewSwaggerDto {
  @ApiProperty({ format: "uuid" })
  cardId!: string;

  @ApiProperty({ enum: [1, 2, 3, 4], description: "1=Again, 2=Hard, 3=Good, 4=Easy" })
  rating!: SrsRating;
}

@ApiTags("Spaced Repetition (SM-2)")
@ApiBearerAuth()
@Controller({ path: "srs", version: "1" })
export class SrsController {
  constructor(private readonly srsService: SrsService) {}

  @Get("due")
  @ApiOperation({ summary: "Fetch due vocabulary flashcards ordered by nextReviewAt" })
  async getDueCards(
    @CurrentUser() principal: AuthenticatedPrincipal | null,
    @Query("limit") limit?: string,
    @Query("deckSlug") deckSlug?: string
  ) {
    if (!principal) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: "UNAUTHORIZED",
        message: "Authentication required",
      });
    }
    return this.srsService.getDueCards(
      principal.userId,
      limit ? Number(limit) : 20,
      deckSlug
    );
  }

  @Post("reviews")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Submit flashcard rating (1..4) and schedule next SM-2 interval" })
  async submitReview(
    @CurrentUser() principal: AuthenticatedPrincipal | null,
    @Body(new ZodValidationPipe(srsReviewRequestSchema))
    body: SrsReviewSwaggerDto
  ) {
    if (!principal) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: "UNAUTHORIZED",
        message: "Authentication required",
      });
    }
    return this.srsService.submitReview(
      principal.userId,
      body as SrsReviewRequest
    );
  }
}
