import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  abandonExamSessionResponseSchema,
  checkExamQuestionResponseSchema,
  commentsListResponseSchema,
  createCommentRequestSchema,
  createCommentResponseSchema,
  examOverviewResponseSchema,
  examResultResponseSchema,
  examSessionQuestionsResponseSchema,
  examSetDetailResponseSchema,
  examSetsResponseSchema,
  saveExamAnswersRequestSchema,
  saveExamAnswersResponseSchema,
  startExamSessionRequestSchema,
  startExamSessionResponseSchema,
  submitExamSessionResponseSchema,
  type ExamTrack,
  type StartExamSessionRequest,
} from "@linguacraft/contracts";
import { apiClient } from "@/shared/api/api-client";

export const examsQueryKeys = {
  sets: (track: ExamTrack) => ["exams", "sets", track] as const,
  setDetail: (setSlug: string) => ["exams", "set", setSlug] as const,
  overview: (slug: string) => ["exams", "overview", slug] as const,
  sessionQuestions: (sessionId: string, part?: number) =>
    ["exams", "session", sessionId, "questions", part ?? "all"] as const,
  result: (sessionId: string) => ["exams", "result", sessionId] as const,
  comments: (targetId: string, page: number) =>
    ["comments", "EXAM", targetId, page] as const,
};

export function useExamSetsQuery(track: ExamTrack) {
  return useQuery({
    queryKey: examsQueryKeys.sets(track),
    queryFn: () =>
      apiClient.request(`/exams/sets?track=${track}`, {
        schema: examSetsResponseSchema,
      }),
  });
}

export function useExamSetDetailQuery(setSlug: string) {
  return useQuery({
    queryKey: examsQueryKeys.setDetail(setSlug),
    queryFn: () =>
      apiClient.request(`/exams/sets/${encodeURIComponent(setSlug)}`, {
        schema: examSetDetailResponseSchema,
      }),
    enabled: Boolean(setSlug),
  });
}

export function useExamOverviewQuery(slug: string) {
  return useQuery({
    queryKey: examsQueryKeys.overview(slug),
    queryFn: () =>
      apiClient.request(`/exams/${encodeURIComponent(slug)}`, {
        schema: examOverviewResponseSchema,
      }),
    enabled: Boolean(slug),
  });
}

export function useExamCommentsQuery(targetId: string, page = 1) {
  return useQuery({
    queryKey: examsQueryKeys.comments(targetId, page),
    queryFn: () =>
      apiClient.request(
        `/comments?targetType=EXAM&targetId=${encodeURIComponent(targetId)}&page=${page}&limit=10`,
        { schema: commentsListResponseSchema }
      ),
    enabled: Boolean(targetId),
  });
}

export function usePostExamCommentMutation(targetId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (content: string) => {
      const payload = createCommentRequestSchema.parse({
        targetType: "EXAM",
        targetId,
        content,
      });
      return apiClient.request("/comments", {
        method: "POST",
        body: payload,
        schema: createCommentResponseSchema,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["comments", "EXAM", targetId],
      });
    },
  });
}

export function useStartExamSessionMutation() {
  return useMutation({
    mutationFn: async (input: StartExamSessionRequest) => {
      const payload = startExamSessionRequestSchema.parse(input);
      return apiClient.request("/exams/sessions/start", {
        method: "POST",
        body: payload,
        schema: startExamSessionResponseSchema,
      });
    },
  });
}

export function useSessionQuestionsQuery(
  sessionId: string,
  part?: number,
  enabled = true
) {
  return useQuery({
    queryKey: examsQueryKeys.sessionQuestions(sessionId, part),
    queryFn: () => {
      const params = new URLSearchParams();
      if (part) params.set("part", String(part));
      const qs = params.toString();
      return apiClient.request(
        `/exams/sessions/${encodeURIComponent(sessionId)}/questions${qs ? `?${qs}` : ""}`,
        { schema: examSessionQuestionsResponseSchema }
      );
    },
    enabled: Boolean(sessionId) && enabled,
  });
}

export function useSaveExamAnswersMutation(sessionId: string) {
  return useMutation({
    mutationFn: async (
      answers: {
        questionNumber: number;
        selectedValue: string;
        isFlagged?: boolean;
      }[]
    ) => {
      const payload = saveExamAnswersRequestSchema.parse({ answers });
      return apiClient.request(
        `/exams/sessions/${encodeURIComponent(sessionId)}/answers`,
        {
          method: "PUT",
          body: payload,
          schema: saveExamAnswersResponseSchema,
        }
      );
    },
  });
}

export function useCheckPracticeQuestionMutation(sessionId: string) {
  return useMutation({
    mutationFn: (questionNumber: number) =>
      apiClient.request(
        `/exams/sessions/${encodeURIComponent(sessionId)}/check/${questionNumber}`,
        { schema: checkExamQuestionResponseSchema }
      ),
  });
}

export function useSubmitExamSessionMutation(sessionId: string) {
  return useMutation({
    mutationFn: () =>
      apiClient.request(
        `/exams/sessions/${encodeURIComponent(sessionId)}/submit`,
        {
          method: "POST",
          schema: submitExamSessionResponseSchema,
        }
      ),
  });
}

export function useAbandonExamSessionMutation(sessionId: string) {
  return useMutation({
    mutationFn: () =>
      apiClient.request(
        `/exams/sessions/${encodeURIComponent(sessionId)}/abandon`,
        {
          method: "POST",
          schema: abandonExamSessionResponseSchema,
        }
      ),
  });
}

export function useExamResultQuery(sessionId: string, enabled = true) {
  return useQuery({
    queryKey: examsQueryKeys.result(sessionId),
    queryFn: () =>
      apiClient.request(
        `/exams/sessions/${encodeURIComponent(sessionId)}/result`,
        { schema: examResultResponseSchema }
      ),
    enabled: Boolean(sessionId) && enabled,
  });
}
