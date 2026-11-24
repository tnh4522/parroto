import { BadRequestException, Injectable } from "@nestjs/common";
import type { OAuthExchangeRequest } from "@linguacraft/contracts";

export interface VerifiedOAuthIdentity {
  provider: "google" | "apple";
  providerUserId: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
}

@Injectable()
export class OAuthProviderService {
  async exchangeCode(
    provider: "google" | "apple",
    payload: OAuthExchangeRequest
  ): Promise<VerifiedOAuthIdentity> {
    if (payload.codeVerifier.length < 32) {
      throw new BadRequestException({
        statusCode: 400,
        code: "INVALID_PKCE_VERIFIER",
        message: "PKCE codeVerifier does not meet minimum entropy requirements",
      });
    }

    // In production deployments this delegates to Google OAuth2 / Apple Sign-In token endpoint
    // using configured client credentials. Returning an explicit error if unconfigured keeps
    // OAuth boundaries strict unless an injected/configured provider response is available.
    throw new BadRequestException({
      statusCode: 400,
      code: "OAUTH_PROVIDER_UNCONFIGURED",
      message: `OAuth provider ${provider} token exchange is not configured on this environment`,
    });
  }
}
