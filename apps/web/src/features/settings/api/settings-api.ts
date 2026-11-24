import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  userPreferencesUpdateSchema,
  userProfileUpdateResponseSchema,
  type AuthUser,
  type UserPreferencesUpdateRequest,
} from "@linguacraft/contracts";
import { authQueryKeys } from "@/features/auth/api/auth-api";
import { apiClient } from "@/shared/api/api-client";
import { useAuthStore } from "@/shared/stores/auth-store";

export function useUpdatePreferencesMutation() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);

  return useMutation({
    mutationFn: async (input: UserPreferencesUpdateRequest) => {
      const payload = userPreferencesUpdateSchema.parse(input);
      return apiClient.request("/users/me/preferences", {
        method: "PATCH",
        body: payload,
        schema: userProfileUpdateResponseSchema,
      });
    },
    onSuccess: (data) => {
      setUser(data.user);
      queryClient.setQueryData<AuthUser>(authQueryKeys.me, data.user);
    },
  });
}
