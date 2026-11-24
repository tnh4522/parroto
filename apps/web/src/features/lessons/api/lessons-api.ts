import { useMutation, useQuery } from "@tanstack/react-query";
import {
  importYoutubeLessonRequestSchema,
  importYoutubeLessonResponseSchema,
  lessonDetailResponseSchema,
  lessonListResponseSchema,
  sentenceAttemptRequestSchema,
  sentenceAttemptResponseSchema,
  type CefrLevel,
  type SentenceAttemptRequest,
} from "@linguacraft/contracts";
import { apiClient } from "@/shared/api/api-client";

export interface LessonListFilters {
  topic?: string;
  level?: CefrLevel | "";
  mode?: "DICTATION" | "SHADOWING" | "";
  page?: number;
  limit?: number;
}

export const lessonsQueryKeys = {
  list: (filters: LessonListFilters) => ["lessons", "list", filters] as const,
  detail: (slug: string) => ["lessons", "detail", slug] as const,
};

export function useLessonListQuery(filters: LessonListFilters) {
  return useQuery({
    queryKey: lessonsQueryKeys.list(filters),
    queryFn: () => {
      const params = new URLSearchParams();
      if (filters.topic) params.set("topic", filters.topic);
      if (filters.level) params.set("level", filters.level);
      if (filters.mode) params.set("mode", filters.mode);
      params.set("page", String(filters.page ?? 1));
      params.set("limit", String(filters.limit ?? 12));
      return apiClient.request(`/lessons?${params.toString()}`, {
        schema: lessonListResponseSchema,
      });
    },
  });
}

export function useLessonDetailQuery(slug: string) {
  return useQuery({
    queryKey: lessonsQueryKeys.detail(slug),
    queryFn: () =>
      apiClient.request(`/lessons/${encodeURIComponent(slug)}`, {
        schema: lessonDetailResponseSchema,
      }),
    enabled: Boolean(slug),
  });
}

export function useImportYoutubeLessonMutation() {
  return useMutation({
    mutationFn: async (youtubeUrl: string) => {
      const payload = importYoutubeLessonRequestSchema.parse({ youtubeUrl });
      return apiClient.request("/lessons/import-youtube", {
        method: "POST",
        body: payload,
        schema: importYoutubeLessonResponseSchema,
      });
    },
  });
}

export function useSubmitSentenceAttemptMutation(lessonId: string) {
  return useMutation({
    mutationFn: async (input: SentenceAttemptRequest) => {
      const payload = sentenceAttemptRequestSchema.parse(input);
      return apiClient.request(`/lessons/${encodeURIComponent(lessonId)}/attempts`, {
        method: "POST",
        body: payload,
        schema: sentenceAttemptResponseSchema,
      });
    },
  });
}
