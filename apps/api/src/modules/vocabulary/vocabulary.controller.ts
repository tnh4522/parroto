import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
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
  createVocabDeckRequestSchema,
  type CefrLevel,
  type CreateVocabDeckRequest,
} from "@linguacraft/contracts";
import { z } from "zod";
import { ZodValidationPipe } from "../../core/http/zod-validation.pipe";
import type { AuthenticatedPrincipal } from "../../core/security/auth-context";
import {
  CurrentUser,
  OptionalAuth,
  Public,
  RateLimit,
} from "../../core/security/security.decorators";
import { VocabularyService } from "./vocabulary.service";

const dictSearchQuerySchema = z.object({
  q: z.string().trim().min(1).max(64),
  locale: z.string().min(2).max(10).default("en"),
});

class CreateVocabDeckSwaggerDto {
  @ApiProperty({ example: "Academic Essay Verbs" })
  title!: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty({ enum: ["A1", "A2", "B1", "B2", "C1", "C2"] })
  cefrLevel!: CefrLevel;

  @ApiProperty({ enum: ["PUBLIC", "PRIVATE"], default: "PRIVATE" })
  visibility!: "PUBLIC" | "PRIVATE";

  @ApiProperty({
    type: "array",
    items: {
      type: "object",
      properties: {
        term: { type: "string" },
        meaning: { type: "string" },
        exampleSentence: { type: "string" },
      },
    },
  })
  cards!: Array<{ term: string; meaning: string; exampleSentence?: string }>;
}

@ApiTags("Vocabulary & Dictionary")
@Controller({ version: "1" })
export class VocabularyController {
  constructor(private readonly vocabService: VocabularyService) {}

  @OptionalAuth()
  @Get("vocabulary/decks")
  @ApiOperation({ summary: "List public or personal vocabulary decks with search & pagination" })
  async listDecks(
    @CurrentUser() principal: AuthenticatedPrincipal | null,
    @Query("visibility") visibility?: "PUBLIC" | "PRIVATE",
    @Query("q") q?: string,
    @Query("page") page?: string
  ) {
    return this.vocabService.listDecks({
      visibility,
      q,
      page: page ? Number(page) : 1,
      callerUserId: principal?.userId ?? null,
    });
  }

  @ApiBearerAuth()
  @Post("vocabulary/decks")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create a personal vocabulary deck with initial cards" })
  async createDeck(
    @CurrentUser() principal: AuthenticatedPrincipal | null,
    @Body(new ZodValidationPipe(createVocabDeckRequestSchema))
    body: CreateVocabDeckSwaggerDto
  ) {
    if (!principal) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: "UNAUTHORIZED",
        message: "Authentication required",
      });
    }
    return this.vocabService.createDeck(
      principal.userId,
      body as CreateVocabDeckRequest
    );
  }

  @OptionalAuth()
  @Get("vocabulary/decks/:slug")
  @ApiOperation({ summary: "Inspect vocabulary deck cards (24-card preview if Pro-locked)" })
  async getDeckDetail(
    @Param("slug") slug: string,
    @CurrentUser() principal: AuthenticatedPrincipal | null
  ) {
    return this.vocabService.getDeckDetail(
      slug,
      principal
        ? {
            userId: principal.userId,
            entitlementTier: principal.entitlementTier,
          }
        : null
    );
  }

  @Public()
  @RateLimit(60, 60, "dictionary-search")
  @Get("dictionary/search")
  @ApiOperation({ summary: "Search cached dictionary entries" })
  async searchDictionary(
    @Query(new ZodValidationPipe(dictSearchQuerySchema))
    query: z.infer<typeof dictSearchQuerySchema>
  ) {
    return this.vocabService.searchDictionary(query.q, query.locale);
  }

  @Public()
  @Get("dictionary/words/:word")
  @ApiOperation({ summary: "Get dictionary entry with phonetics and meanings" })
  async getWord(@Param("word") word: string) {
    return this.vocabService.getDictionaryWord(word);
  }
}
