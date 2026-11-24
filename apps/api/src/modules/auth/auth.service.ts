import { createHash, randomBytes, randomUUID } from "node:crypto";
import {
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type {
  AuthTokenResponse,
  AuthUser,
  MagicLinkRequest,
  OAuthExchangeRequest,
} from "@linguacraft/contracts";
import { getAppEnv } from "../../core/config/env";
import { PrismaService } from "../../core/database/prisma.service";
import { appLogger } from "../../core/observability/logger.service";
import { RedisService } from "../../core/redis/redis.service";
import { UsersService } from "../users/users.service";
import { OAuthProviderService } from "./oauth-provider.service";

export const REFRESH_COOKIE_NAME = "lc_refresh";
const MAGIC_LINK_TTL_SEC = 600;

function sha256Hex(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

function defaultDisplayNameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "Learner";
  return local.slice(0, 40) || "Learner";
}

export interface IssuedSessionResult {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly oauthProvider: OAuthProviderService
  ) {}

  async requestMagicLink(dto: MagicLinkRequest): Promise<{ sent: boolean }> {
    const email = dto.email.trim().toLowerCase();
    const rawToken = randomBytes(32).toString("base64url");
    const tokenHash = sha256Hex(rawToken);

    await this.redis.setJson(
      `magic_link:${tokenHash}`,
      { email },
      MAGIC_LINK_TTL_SEC
    );

    if (process.env.NODE_ENV !== "production") {
      appLogger.info(
        { email, magicLinkTokenHashPrefix: tokenHash.slice(0, 8) },
        "Magic link token queued for dispatch"
      );
    }

    return { sent: true };
  }

  async verifyMagicLink(
    rawToken: string,
    meta: { userAgent?: string; ip?: string }
  ): Promise<IssuedSessionResult> {
    if (!rawToken || rawToken.trim().length < 8) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: "INVALID_MAGIC_LINK",
        message: "Magic link token is invalid or missing",
      });
    }

    const tokenHash = sha256Hex(rawToken.trim());
    const redisKey = `magic_link:${tokenHash}`;
    const stored = await this.redis.getJson<{ email: string }>(redisKey);

    if (!stored?.email) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: "INVALID_MAGIC_LINK",
        message: "Magic link token has expired or already been used",
      });
    }

    await this.redis.del(redisKey);

    const user = await this.upsertUserByEmail(stored.email);
    return this.createSessionForUser(user.id, meta);
  }

  async exchangeOAuth(
    provider: "google" | "apple",
    dto: OAuthExchangeRequest,
    meta: { userAgent?: string; ip?: string }
  ): Promise<IssuedSessionResult> {
    const identity = await this.oauthProvider.exchangeCode(provider, dto);
    const normalizedEmail = identity.email.trim().toLowerCase();

    const existingLink = await this.prisma.oAuthAccount.findUnique({
      where: {
        provider_providerUserId: {
          provider: identity.provider,
          providerUserId: identity.providerUserId,
        },
      },
      select: { userId: true },
    });

    let userId: string;
    if (existingLink) {
      userId = existingLink.userId;
    } else {
      const user = await this.upsertUserByEmail(
        normalizedEmail,
        identity.displayName,
        identity.avatarUrl
      );
      await this.prisma.oAuthAccount.create({
        data: {
          userId: user.id,
          provider: identity.provider,
          providerUserId: identity.providerUserId,
        },
      });
      userId = user.id;
    }

    return this.createSessionForUser(userId, meta);
  }

  async refreshSession(
    rawRefreshToken: string | undefined,
    meta: { userAgent?: string; ip?: string }
  ): Promise<{ accessToken: string; refreshToken: string }> {
    if (!rawRefreshToken || rawRefreshToken.trim().length < 16) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: "REFRESH_INVALID",
        message: "Refresh session cookie is missing",
      });
    }

    const tokenHash = sha256Hex(rawRefreshToken.trim());
    const session = await this.prisma.authSession.findUnique({
      where: { refreshTokenHash: tokenHash },
    });

    if (!session) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: "REFRESH_INVALID",
        message: "Refresh session is invalid",
      });
    }

    // Reuse detection: revoked refresh token presented -> revoke entire family
    if (session.revokedAt !== null) {
      await this.prisma.authSession.updateMany({
        where: { familyId: session.familyId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException({
        statusCode: 401,
        code: "REFRESH_REUSE_DETECTED",
        message: "Refresh token reuse detected; session family revoked",
      });
    }

    if (session.expiresAt <= new Date()) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: "REFRESH_EXPIRED",
        message: "Refresh session expired; please sign in again",
      });
    }

    const nextRefreshToken = randomBytes(32).toString("base64url");
    const nextRefreshHash = sha256Hex(nextRefreshToken);
    const ttlDays = getAppEnv().REFRESH_TOKEN_TTL_DAYS;
    const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);

    const nextSession = await this.prisma.$transaction(async (tx) => {
      await tx.authSession.update({
        where: { id: session.id },
        data: { revokedAt: new Date() },
      });

      return tx.authSession.create({
        data: {
          userId: session.userId,
          familyId: session.familyId,
          refreshTokenHash: nextRefreshHash,
          userAgent: meta.userAgent ?? session.userAgent,
          ipHash: meta.ip ? sha256Hex(meta.ip) : session.ipHash,
          expiresAt,
        },
      });
    });

    const user = await this.usersService.getSerializedUser(session.userId);
    const accessToken = await this.signAccessToken(user, nextSession.id);

    return { accessToken, refreshToken: nextRefreshToken };
  }

  async logout(
    userId: string,
    sessionId?: string,
    rawRefreshToken?: string
  ): Promise<void> {
    if (sessionId) {
      const target = await this.prisma.authSession.findUnique({
        where: { id: sessionId },
        select: { familyId: true },
      });
      if (target) {
        await this.prisma.authSession.updateMany({
          where: { userId, familyId: target.familyId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
        return;
      }
    }

    if (rawRefreshToken) {
      await this.prisma.authSession.updateMany({
        where: { userId, refreshTokenHash: sha256Hex(rawRefreshToken), revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
  }

  private async upsertUserByEmail(
    email: string,
    displayName?: string,
    avatarUrl?: string
  ): Promise<{ id: string }> {
    const existing = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existing) return existing;

    return this.prisma.user.create({
      data: {
        email,
        displayName: displayName || defaultDisplayNameFromEmail(email),
        avatarUrl: avatarUrl ?? null,
        stats: { create: {} },
      },
      select: { id: true },
    });
  }

  async createSessionForUser(
    userId: string,
    meta: { userAgent?: string; ip?: string }
  ): Promise<IssuedSessionResult & AuthTokenResponse> {
    const refreshToken = randomBytes(32).toString("base64url");
    const refreshTokenHash = sha256Hex(refreshToken);
    const familyId = randomUUID();
    const ttlDays = getAppEnv().REFRESH_TOKEN_TTL_DAYS;
    const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);

    const session = await this.prisma.authSession.create({
      data: {
        userId,
        familyId,
        refreshTokenHash,
        userAgent: meta.userAgent,
        ipHash: meta.ip ? sha256Hex(meta.ip) : null,
        expiresAt,
      },
    });

    const user = await this.usersService.getSerializedUser(userId);
    const accessToken = await this.signAccessToken(user, session.id);

    return { accessToken, refreshToken, user };
  }

  private async signAccessToken(user: AuthUser, sessionId: string): Promise<string> {
    const env = getAppEnv();
    return this.jwtService.signAsync(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        entitlementTier: user.entitlementTier,
        ageVerified: user.ageVerified,
        sessionId,
      },
      {
        secret: env.JWT_ACCESS_SECRET,
        expiresIn: env.JWT_ACCESS_TTL_SEC,
      }
    );
  }
}
