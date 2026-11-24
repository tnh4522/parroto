import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  srsDueResponseSchema,
  srsReviewRequestSchema,
  srsReviewResponseSchema,
  type SrsReviewRequest,
} from "@linguacraft/contracts";
import { apiClient } from "@/shared/api/api-client";

export const srsQueryKeys = {
  due: (limit: number, deckSlug?: string) =>
    ["srs", "due", limit, deckSlug ?? ""] as const,
};

export function useSrsDueQuery(
  limit = 20,
  deckSlug?: string,
  enabled = true
) {
  return useQuery({
    queryKey: srsQueryKeys.due(limit, deckSlug),
    queryFn: () => {
      const params = new URLSearchParams();
      params.set("limit", String(limit));
      if (deckSlug) params.set("deckSlug", deckSlug);
      return apiClient.request(`/srs/due?${params.toString()}`, {
        schema: srsDueResponseSchema,
      });
    },
    enabled,
  });
}

export function useSubmitSrsReviewMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: SrsReviewRequest) => {
      const payload = srsReviewRequestSchema.parse(input);
      return apiClient.request("/srs/reviews", {
        method: "POST",
        body: payload,
        schema: srsReviewResponseSchema,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["srs", "due"] });
    },
  });
}
