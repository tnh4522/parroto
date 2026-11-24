import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  authTokenResponseSchema,
  authUserSchema,
  magicLinkRequestSchema,
  oauthExchangeRequestSchema,
  onboardingUpdateSchema,
  type AuthUser,
  type MagicLinkRequest,
  type OAuthExchangeRequest,
  type OnboardingUpdateRequest,
} from "@linguacraft/contracts";
import { z } from "zod";
import { apiClient } from "@/shared/api/api-client";
import { useAuthStore } from "@/shared/stores/auth-store";

export const authQueryKeys = {
  me: ["auth", "me"] as const,
};

const magicLinkResponseSchema = z.object({
  sent: z.boolean(),
});

const onboardingResponseSchema = z.object({
  user: authUserSchema,
});

export function useCurrentUserQuery() {
  const status = useAuthStore((s) => s.status);
  return useQuery({
    queryKey: authQueryKeys.me,
    queryFn: () => apiClient.request("/users/me", { schema: authUserSchema }),
    enabled: status === "authenticated",
  });
}

export function useMagicLinkMutation() {
  return useMutation({
    mutationFn: async (input: MagicLinkRequest) => {
      const payload = magicLinkRequestSchema.parse(input);
      return apiClient.request("/auth/magic-link", {
        method: "POST",
        body: payload,
        schema: magicLinkResponseSchema,
        skipAuthRefresh: true,
      });
    },
  });
}

export function useOAuthExchangeMutation() {
  const queryClient = useQueryClient();
  const setSession = useAuthStore((s) => s.setSession);

  return useMutation({
    mutationFn: async ({
      provider,
      payload,
    }: {
      provider: "google" | "apple";
      payload: OAuthExchangeRequest;
    }) => {
      const parsed = oauthExchangeRequestSchema.parse(payload);
      return apiClient.request(`/auth/oauth/${provider}/exchange`, {
        method: "POST",
        body: parsed,
        schema: authTokenResponseSchema,
        skipAuthRefresh: true,
      });
    },
    onSuccess: (data) => {
      setSession(data.accessToken, data.user);
      queryClient.setQueryData(authQueryKeys.me, data.user);
    },
  });
}

export function useOnboardingMutation() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);

  return useMutation({
    mutationFn: async (input: OnboardingUpdateRequest) => {
      const payload = onboardingUpdateSchema.parse(input);
      return apiClient.request("/users/me/onboarding", {
        method: "PATCH",
        body: payload,
        schema: onboardingResponseSchema,
      });
    },
    onSuccess: (data) => {
      setUser(data.user);
      queryClient.setQueryData<AuthUser>(authQueryKeys.me, data.user);
    },
  });
}

export function useLogoutMutation() {
  const queryClient = useQueryClient();
  const clearSession = useAuthStore((s) => s.clearSession);

  return useMutation({
    mutationFn: () =>
      apiClient.request("/auth/logout", {
        method: "POST",
      }),
    onSettled: () => {
      clearSession();
      queryClient.removeQueries({ queryKey: authQueryKeys.me });
    },
  });
}
