import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UnauthorizedException,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProperty,
  ApiTags,
} from "@nestjs/swagger";
import { presignUploadRequestSchema } from "@linguacraft/contracts";
import type { z } from "zod";
import { ZodValidationPipe } from "../../core/http/zod-validation.pipe";
import type { AuthenticatedPrincipal } from "../../core/security/auth-context";
import {
  CurrentUser,
  OptionalAuth,
  RateLimit,
} from "../../core/security/security.decorators";
import { MediaService } from "./media.service";

class PresignUploadSwaggerDto {
  @ApiProperty({ enum: ["SHADOWING_RECORDING", "SPEAKING_CLIP"] })
  purpose!: "SHADOWING_RECORDING" | "SPEAKING_CLIP";

  @ApiProperty({ example: "audio/webm;codecs=opus" })
  mimeType!: string;

  @ApiProperty({ example: 48200 })
  contentLength!: number;
}

@ApiTags("Media")
@Controller({ path: "media", version: "1" })
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @ApiBearerAuth()
  @RateLimit(20, 60, "media-presign")
  @Post("presign-upload")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Issue a short-lived S3 pre-signed PUT upload URL" })
  async presignUpload(
    @CurrentUser() principal: AuthenticatedPrincipal | null,
    @Body(new ZodValidationPipe(presignUploadRequestSchema))
    body: PresignUploadSwaggerDto
  ) {
    if (!principal) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: "UNAUTHORIZED",
        message: "Authentication required",
      });
    }
    return this.mediaService.presignUpload(
      principal.userId,
      body as z.infer<typeof presignUploadRequestSchema>
    );
  }

  @ApiBearerAuth()
  @Post(":assetId/confirm")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Verify uploaded S3 object via HeadObject and mark asset ready" })
  async confirmUpload(
    @CurrentUser() principal: AuthenticatedPrincipal | null,
    @Param("assetId", ParseUUIDPipe) assetId: string
  ) {
    if (!principal) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: "UNAUTHORIZED",
        message: "Authentication required",
      });
    }
    return this.mediaService.confirmUpload(principal.userId, assetId);
  }

  @OptionalAuth()
  @Get(":assetId/stream-url")
  @ApiOperation({ summary: "Get short-lived signed playback URL for authorized media" })
  async getStreamUrl(
    @CurrentUser() principal: AuthenticatedPrincipal | null,
    @Param("assetId", ParseUUIDPipe) assetId: string
  ) {
    return this.mediaService.getSignedStreamUrl(
      assetId,
      principal
        ? {
            userId: principal.userId,
            entitlementTier: principal.entitlementTier,
          }
        : null
    );
  }

  @ApiBearerAuth()
  @Delete(":assetId")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Delete uploaded user recording from private S3 storage and scrub metadata links",
  })
  async deleteAsset(
    @CurrentUser() principal: AuthenticatedPrincipal | null,
    @Param("assetId", ParseUUIDPipe) assetId: string
  ) {
    if (!principal) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: "UNAUTHORIZED",
        message: "Authentication required",
      });
    }
    return this.mediaService.deleteMediaAsset(principal.userId, assetId);
  }
}
