import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  UnauthorizedException,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiPropertyOptional, ApiTags } from "@nestjs/swagger";
import {
  audioConsentRequestSchema,
  onboardingUpdateSchema,
  userPreferencesUpdateSchema,
  type AudioConsentRequest,
  type OnboardingUpdateRequest,
  type UserPreferencesUpdateRequest,
} from "@linguacraft/contracts";
import { ZodValidationPipe } from "../../core/http/zod-validation.pipe";
import type { AuthenticatedPrincipal } from "../../core/security/auth-context";
import { CurrentUser } from "../../core/security/security.decorators";
import { UsersService } from "./users.service";

class OnboardingSwaggerDto {
  @ApiPropertyOptional({ example: "alex_english" })
  username!: string;

  @ApiPropertyOptional({ example: "1998-05-12" })
  birthDate?: string;

  @ApiPropertyOptional({ example: "vi" })
  preferredTranslateLang?: string;
}

class UserPreferencesSwaggerDto {
  @ApiPropertyOptional({ example: "Alex Rivera" })
  displayName?: string;

  @ApiPropertyOptional({ enum: ["en", "vi"] })
  preferredUiLocale?: "en" | "vi";

  @ApiPropertyOptional({ example: "vi" })
  preferredTranslateLang?: string;

  @ApiPropertyOptional({ example: "1998-05-12" })
  birthDate?: string;
}

@ApiTags("Users")
@ApiBearerAuth()
@Controller({ path: "users", version: "1" })
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get("me")
  @ApiOperation({ summary: "Get authenticated user profile, entitlement tier, and stats" })
  async getMe(@CurrentUser() principal: AuthenticatedPrincipal | null) {
    if (!principal) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: "UNAUTHORIZED",
        message: "Authentication required",
      });
    }
    return this.usersService.getSerializedUser(principal.userId);
  }

  @Patch("me/onboarding")
  @ApiOperation({ summary: "Complete initial username and optional age verification" })
  async completeOnboarding(
    @CurrentUser() principal: AuthenticatedPrincipal | null,
    @Body(new ZodValidationPipe(onboardingUpdateSchema))
    body: OnboardingSwaggerDto
  ) {
    if (!principal) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: "UNAUTHORIZED",
        message: "Authentication required",
      });
    }
    return this.usersService.completeOnboarding(
      principal.userId,
      body as OnboardingUpdateRequest
    );
  }

  @Patch("me/preferences")
  @ApiOperation({ summary: "Update display name, UI locale, translation language, or birth date" })
  async updatePreferences(
    @CurrentUser() principal: AuthenticatedPrincipal | null,
    @Body(new ZodValidationPipe(userPreferencesUpdateSchema))
    body: UserPreferencesSwaggerDto
  ) {
    if (!principal) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: "UNAUTHORIZED",
        message: "Authentication required",
      });
    }
    return this.usersService.updatePreferences(
      principal.userId,
      body as UserPreferencesUpdateRequest
    );
  }

  @Post("me/audio-consent")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Record explicit user consent for cloud audio recording & processing" })
  async recordAudioConsent(
    @CurrentUser() principal: AuthenticatedPrincipal | null,
    @Body(new ZodValidationPipe(audioConsentRequestSchema))
    body: { accepted: true; policyVersion: string }
  ) {
    if (!principal) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: "UNAUTHORIZED",
        message: "Authentication required",
      });
    }
    const parsed = body as AudioConsentRequest;
    return this.usersService.recordAudioConsent(
      principal.userId,
      parsed.policyVersion
    );
  }
}
