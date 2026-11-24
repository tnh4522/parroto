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
  cefrLevelSchema,
  createCommentRequestSchema,
  createSpeakingRoomRequestSchema,
  type CefrLevel,
  type CreateSpeakingRoomRequest,
} from "@linguacraft/contracts";
import { z } from "zod";
import { ZodValidationPipe } from "../../core/http/zod-validation.pipe";
import type { AuthenticatedPrincipal } from "../../core/security/auth-context";
import {
  CurrentUser,
  Public,
  RateLimit,
  RequireAgeVerified,
} from "../../core/security/security.decorators";
import { CommunityService } from "./community.service";

const listCommentsQuerySchema = z.object({
  targetType: z.enum(["LESSON", "STORY", "EXAM"]),
  targetId: z.string().uuid(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

class CreateCommentSwaggerDto {
  @ApiProperty({ enum: ["LESSON", "STORY", "EXAM"] })
  targetType!: "LESSON" | "STORY" | "EXAM";

  @ApiProperty({ format: "uuid" })
  targetId!: string;

  @ApiProperty({ maxLength: 1000 })
  content!: string;
}

class CreateSpeakingRoomSwaggerDto {
  @ApiProperty({ example: "Evening IELTS Speaking Practice" })
  name!: string;

  @ApiProperty({ example: "IELTS Speaking" })
  topic!: string;

  @ApiProperty({ enum: ["A1", "A2", "B1", "B2", "C1", "C2"] })
  cefrLevel!: CefrLevel;

  @ApiProperty({ minimum: 2, maximum: 5, default: 4 })
  maxParticipants!: number;

  @ApiProperty({ default: false })
  isPrivate!: boolean;
}

@ApiTags("Community, Comments & Voice Speaking Rooms")
@Controller({ version: "1" })
export class CommunityController {
  constructor(private readonly communityService: CommunityService) {}

  @Public()
  @Get("comments")
  @ApiOperation({ summary: "List public paginated comments for lesson, story, or exam" })
  async listComments(
    @Query(new ZodValidationPipe(listCommentsQuerySchema))
    query: z.infer<typeof listCommentsQuerySchema>
  ) {
    return this.communityService.listComments(query);
  }

  @ApiBearerAuth()
  @RateLimit(15, 60, "comments-create")
  @Post("comments")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Post a moderated comment" })
  async createComment(
    @CurrentUser() principal: AuthenticatedPrincipal | null,
    @Body(new ZodValidationPipe(createCommentRequestSchema))
    body: CreateCommentSwaggerDto
  ) {
    if (!principal) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: "UNAUTHORIZED",
        message: "Authentication required",
      });
    }
    return this.communityService.createComment(
      principal.userId,
      body as z.infer<typeof createCommentRequestSchema>
    );
  }

  @Public()
  @Get("speaking/rooms")
  @ApiOperation({ summary: "List active community speaking rooms" })
  async listSpeakingRooms(
    @Query("cefrLevel") cefrLevel?: string,
    @Query("topic") topic?: string
  ) {
    const parsedLevel = cefrLevel ? cefrLevelSchema.parse(cefrLevel) : undefined;
    return this.communityService.listSpeakingRooms({
      cefrLevel: parsedLevel,
      topic,
    });
  }

  @ApiBearerAuth()
  @RequireAgeVerified()
  @RateLimit(5, 300, "speaking-room-create")
  @Post("speaking/rooms")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Create a community speaking voice room (requires age verification)",
  })
  async createSpeakingRoom(
    @CurrentUser() principal: AuthenticatedPrincipal | null,
    @Body(new ZodValidationPipe(createSpeakingRoomRequestSchema))
    body: CreateSpeakingRoomSwaggerDto
  ) {
    if (!principal) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: "UNAUTHORIZED",
        message: "Authentication required",
      });
    }
    return this.communityService.createSpeakingRoom(
      principal.userId,
      body as CreateSpeakingRoomRequest
    );
  }
}
