import { useQuery } from "@tanstack/react-query";
import {
  examAnalyticsResponseSchema,
  examHistoryResponseSchema,
  type ExamTrack,
} from "@linguacraft/contracts";
import { apiClient } from "@/shared/api/api-client";

export const analyticsQueryKeys = {
  track: (track: ExamTrack) => ["exams", "analytics", track] as const,
  history: (track: ExamTrack, page: number) =>
    ["exams", "history", track, page] as const,
};

export function useExamAnalyticsQuery(track: ExamTrack, enabled = true) {
  return useQuery({
    queryKey: analyticsQueryKeys.track(track),
    queryFn: () =>
      apiClient.request(`/exams/analytics?track=${track}`, {
        schema: examAnalyticsResponseSchema,
      }),
    enabled,
  });
}

export function useExamHistoryQuery(
  track: ExamTrack,
  page = 1,
  enabled = true
) {
  return useQuery({
    queryKey: analyticsQueryKeys.history(track, page),
    queryFn: () =>
      apiClient.request(`/exams/history?track=${track}&page=${page}`, {
        schema: examHistoryResponseSchema,
      }),
    enabled,
  });
}
