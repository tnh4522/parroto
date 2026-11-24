import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  dailyLessonsResponseSchema,
  streakCheckinResponseSchema,
} from "@linguacraft/contracts";
import { authQueryKeys } from "@/features/auth/api/auth-api";
import { apiClient } from "@/shared/api/api-client";

export const dashboardQueryKeys = {
  dailyLessons: ["lessons", "daily"] as const,
};

export function useDailyLessonsQuery() {
  return useQuery({
    queryKey: dashboardQueryKeys.dailyLessons,
    queryFn: () =>
      apiClient.request("/lessons/daily", { schema: dailyLessonsResponseSchema }),
  });
}

export function useStreakCheckinMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiClient.request("/streak/checkin", {
        method: "POST",
        schema: streakCheckinResponseSchema,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: authQueryKeys.me });
    },
  });
}
