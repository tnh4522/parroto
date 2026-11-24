import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProperty,
  ApiTags,
} from "@nestjs/swagger";
import {
  magicLinkRequestSchema,
  oauthExchangeRequestSchema,
  type MagicLinkRequest,
  type OAuthExchangeRequest,
} from "@linguacraft/contracts";
import type { Request, Response } from "express";
import { z } from "zod";
import { getAppEnv } from "../../core/config/env";
import { ZodValidationPipe } from "../../core/http/zod-validation.pipe";
import type { AuthenticatedPrincipal } from "../../core/security/auth-context";
import {
  CurrentUser,
  Public,
  RateLimit,
} from "../../core/security/security.decorators";
import { AuthService, REFRESH_COOKIE_NAME } from "./auth.service";

class MagicLinkSwaggerDto {
  @ApiProperty({ example: "learner@linguacraft.app" })
  email!: string;
}

class OAuthExchangeSwaggerDto {
  @ApiProperty()
  code!: string;

  @ApiProperty()
  codeVerifier!: string;

  @ApiProperty()
  redirectUri!: string;
}

const verifyTokenBodySchema = z
  .object({
    token: z.string().min(8).optional(),
  })
  .optional()
  .default({});

const oauthProviderSchema = z.enum(["google", "apple"]);

function setRefreshCookie(res: Response, token: string): void {
  const env = getAppEnv();
  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/v1/auth",
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
  });
}

@ApiTags("Authentication")
@Controller({ path: "auth", version: "1" })
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @RateLimit(10, 60, "auth-magic-link")
  @Post("magic-link")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Request a single-use 10-minute email magic link" })
  async requestMagicLink(
    @Body(new ZodValidationPipe(magicLinkRequestSchema))
    body: MagicLinkSwaggerDto
  ) {
    return this.authService.requestMagicLink(body as MagicLinkRequest);
  }

  @Public()
  @RateLimit(15, 60, "auth-magic-verify")
  @Post("magic-link/verify")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Verify a magic link token and issue JWT + refresh cookie" })
  async verifyMagicLink(
    @Query("token") queryToken: string | undefined,
    @Body(new ZodValidationPipe(verifyTokenBodySchema))
    body: { token?: string },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    const token = queryToken ?? body.token;
    if (!token) {
      throw new BadRequestException({
        statusCode: 400,
        code: "TOKEN_REQUIRED",
        message: "Verification token is required",
      });
    }

    const issued = await this.authService.verifyMagicLink(token, {
      userAgent: req.header("user-agent"),
      ip: req.ip,
    });
    setRefreshCookie(res, issued.refreshToken);
    return { accessToken: issued.accessToken };
  }

  @Public()
  @RateLimit(15, 60, "auth-oauth-exchange")
  @Post("oauth/:provider/exchange")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Exchange PKCE authorization code from Google or Apple" })
  async exchangeOAuth(
    @Param("provider", new ZodValidationPipe(oauthProviderSchema))
    provider: "google" | "apple",
    @Body(new ZodValidationPipe(oauthExchangeRequestSchema))
    body: OAuthExchangeSwaggerDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    const issued = await this.authService.exchangeOAuth(
      provider,
      body as OAuthExchangeRequest,
      {
        userAgent: req.header("user-agent"),
        ip: req.ip,
      }
    );
    setRefreshCookie(res, issued.refreshToken);
    return { accessToken: issued.accessToken, user: issued.user };
  }

  @Public()
  @RateLimit(30, 60, "auth-refresh")
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Rotate refresh cookie and issue a fresh short-lived JWT" })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    const cookies = (req.cookies ?? {}) as Record<string, string | undefined>;
    const rawRefresh = cookies[REFRESH_COOKIE_NAME];
    const rotated = await this.authService.refreshSession(rawRefresh, {
      userAgent: req.header("user-agent"),
      ip: req.ip,
    });
    setRefreshCookie(res, rotated.refreshToken);
    return { accessToken: rotated.accessToken };
  }

  @ApiBearerAuth()
  @Post("logout")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Revoke active refresh token family and clear cookie" })
  async logout(
    @CurrentUser() principal: AuthenticatedPrincipal | null,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ): Promise<void> {
    if (!principal) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: "UNAUTHORIZED",
        message: "Authentication required",
      });
    }
    const cookies = (req.cookies ?? {}) as Record<string, string | undefined>;
    await this.authService.logout(
      principal.userId,
      principal.sessionId,
      cookies[REFRESH_COOKIE_NAME]
    );
    res.clearCookie(REFRESH_COOKIE_NAME, { path: "/api/v1/auth" });
  }
}
