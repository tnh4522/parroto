import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import type { EntitlementTier, UserRole } from "@linguacraft/contracts";
import { getAppEnv } from "../config/env";
import { PrismaService } from "../database/prisma.service";
import { RedisService } from "../redis/redis.service";
import type {
  AuthenticatedPrincipal,
  RequestWithAuth,
} from "./auth-context";
import {
  IS_OPTIONAL_AUTH_KEY,
  IS_PUBLIC_KEY,
  RATE_LIMIT_KEY,
  REQUIRE_AGE_VERIFIED_KEY,
  REQUIRED_ENTITLEMENT_KEY,
  ROLES_KEY,
  type RateLimitConfig,
} from "./security.decorators";

interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  entitlementTier: EntitlementTier;
  ageVerified: boolean;
  sessionId?: string;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== "http") return true;

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const isOptional = this.reflector.getAllAndOverride<boolean>(
      IS_OPTIONAL_AUTH_KEY,
      [context.getHandler(), context.getClass()]
    );

    const req = context.switchToHttp().getRequest<RequestWithAuth>();
    const rawAuth = req.headers.authorization;
    const header = Array.isArray(rawAuth) ? rawAuth[0] : rawAuth;

    if (!header || !header.startsWith("Bearer ")) {
      if (isOptional) {
        req.authUser = null;
        return true;
      }
      throw new UnauthorizedException({
        statusCode: 401,
        code: "UNAUTHORIZED",
        message: "Missing Bearer access token",
      });
    }

    const token = header.slice("Bearer ".length).trim();
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: getAppEnv().JWT_ACCESS_SECRET,
      });

      const userRecord = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
          ageVerifiedAt: true,
          entitlements: {
            where: {
              revokedAt: null,
              OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
            },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      });

      if (!userRecord) {
        if (isOptional) {
          req.authUser = null;
          return true;
        }
        throw new UnauthorizedException({
          statusCode: 401,
          code: "UNAUTHORIZED",
          message: "Account not found",
        });
      }

      if (userRecord.status === "BANNED" || userRecord.status === "SUSPENDED") {
        throw new ForbiddenException({
          statusCode: 403,
          code: "ACCOUNT_BANNED",
          message: "Your account is currently suspended or banned",
        });
      }

      const activeGrant = userRecord.entitlements[0];
      const resolvedTier: EntitlementTier = activeGrant
        ? activeGrant.tier
        : "FREE";

      const principal: AuthenticatedPrincipal = {
        userId: userRecord.id,
        email: userRecord.email,
        role: userRecord.role,
        entitlementTier: resolvedTier,
        ageVerified: Boolean(userRecord.ageVerifiedAt),
        sessionId: payload.sessionId,
      };
      req.authUser = principal;
      return true;
    } catch (err) {
      if (err instanceof ForbiddenException) throw err;
      if (isOptional) {
        req.authUser = null;
        return true;
      }
      throw new UnauthorizedException({
        statusCode: 401,
        code: "INVALID_TOKEN",
        message: "Invalid or expired access token",
      });
    }
  }
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    if (context.getType() !== "http") return true;
    const required = this.reflector.getAllAndOverride<UserRole[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()]
    );
    if (!required || required.length === 0) return true;

    const req = context.switchToHttp().getRequest<RequestWithAuth>();
    if (!req.authUser || !required.includes(req.authUser.role)) {
      throw new ForbiddenException({
        statusCode: 403,
        code: "INSUFFICIENT_ROLE",
        message: "You do not have permission to perform this action",
      });
    }
    return true;
  }
}

const TIER_RANK: Record<EntitlementTier, number> = {
  FREE: 0,
  PRO: 1,
  LIFETIME: 2,
};

@Injectable()
export class EntitlementGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    if (context.getType() !== "http") return true;
    const requiredTier = this.reflector.getAllAndOverride<
      EntitlementTier | undefined
    >(REQUIRED_ENTITLEMENT_KEY, [context.getHandler(), context.getClass()]);
    if (!requiredTier) return true;

    const req = context.switchToHttp().getRequest<RequestWithAuth>();
    const userTier = req.authUser?.entitlementTier ?? "FREE";
    if (!req.authUser || TIER_RANK[userTier] < TIER_RANK[requiredTier]) {
      throw new ForbiddenException({
        statusCode: 403,
        code: "ENTITLEMENT_REQUIRED",
        message: "Active PRO or LIFETIME entitlement is required",
      });
    }
    return true;
  }
}

@Injectable()
export class ComplianceGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    if (context.getType() !== "http") return true;
    const required = this.reflector.getAllAndOverride<boolean>(
      REQUIRE_AGE_VERIFIED_KEY,
      [context.getHandler(), context.getClass()]
    );
    if (!required) return true;

    const req = context.switchToHttp().getRequest<RequestWithAuth>();
    if (!req.authUser) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: "UNAUTHORIZED",
        message: "Authentication required",
      });
    }
    if (!req.authUser.ageVerified) {
      throw new ForbiddenException({
        statusCode: 403,
        code: "AGE_VERIFICATION_REQUIRED",
        message:
          "Age verification via birth date in settings is required for this feature",
      });
    }
    return true;
  }
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly redis: RedisService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== "http") return true;

    const config = this.reflector.getAllAndOverride<RateLimitConfig | undefined>(
      RATE_LIMIT_KEY,
      [context.getHandler(), context.getClass()]
    );
    if (!config) return true;

    const req = context.switchToHttp().getRequest<RequestWithAuth>();
    const actorKey = req.authUser?.userId ?? req.ip ?? "anon";
    const bucket = config.bucket ?? req.route?.path ?? req.url ?? "global";
    const redisKey = `rl:${bucket}:${actorKey}`;

    const result = await this.redis.consumeRateLimit(
      redisKey,
      config.limit,
      config.windowSeconds
    );
    if (!result.allowed) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          code: "RATE_LIMIT_EXCEEDED",
          message: "Too many requests; please try again shortly",
        },
        HttpStatus.TOO_MANY_REQUESTS
      );
    }
    return true;
  }
}
