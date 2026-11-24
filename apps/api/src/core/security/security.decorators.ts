import {
  createParamDecorator,
  SetMetadata,
  type ExecutionContext,
} from "@nestjs/common";
import type { EntitlementTier, UserRole } from "@linguacraft/contracts";
import type {
  AuthenticatedPrincipal,
  RequestWithAuth,
} from "./auth-context";

export const IS_PUBLIC_KEY = "linguacraft:is_public";
export const IS_OPTIONAL_AUTH_KEY = "linguacraft:is_optional_auth";
export const ROLES_KEY = "linguacraft:roles";
export const REQUIRED_ENTITLEMENT_KEY = "linguacraft:entitlement";
export const REQUIRE_AGE_VERIFIED_KEY = "linguacraft:age_verified";
export const RATE_LIMIT_KEY = "linguacraft:rate_limit";

export interface RateLimitConfig {
  limit: number;
  windowSeconds: number;
  bucket?: string;
}

export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
export const OptionalAuth = () => SetMetadata(IS_OPTIONAL_AUTH_KEY, true);
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
export const RequireEntitlement = (tier: EntitlementTier) =>
  SetMetadata(REQUIRED_ENTITLEMENT_KEY, tier);
export const RequireAgeVerified = () =>
  SetMetadata(REQUIRE_AGE_VERIFIED_KEY, true);
export const RateLimit = (
  limit: number,
  windowSeconds: number,
  bucket?: string
) => SetMetadata(RATE_LIMIT_KEY, { limit, windowSeconds, bucket } satisfies RateLimitConfig);

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedPrincipal | null => {
    const req = ctx.switchToHttp().getRequest<RequestWithAuth>();
    return req.authUser ?? null;
  }
);
