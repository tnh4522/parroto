import type { EntitlementTier, UserRole } from "@linguacraft/contracts";

export interface AuthenticatedPrincipal {
  userId: string;
  email: string;
  role: UserRole;
  entitlementTier: EntitlementTier;
  ageVerified: boolean;
  sessionId?: string;
}

export interface RequestWithAuth {
  headers: Record<string, string | string[] | undefined>;
  ip?: string;
  route?: { path?: string };
  url?: string;
  authUser?: AuthenticatedPrincipal | null;
}
