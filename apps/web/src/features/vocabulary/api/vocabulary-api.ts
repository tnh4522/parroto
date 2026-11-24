import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createVocabDeckRequestSchema,
  createVocabDeckResponseSchema,
  vocabDeckDetailResponseSchema,
  vocabDeckListResponseSchema,
  type CreateVocabDeckRequest,
  type VocabVisibility,
} from "@linguacraft/contracts";
import { apiClient } from "@/shared/api/api-client";

export interface VocabDeckFilters {
  visibility?: VocabVisibility | "";
  q?: string;
  page?: number;
}

export const vocabQueryKeys = {
  list: (filters: VocabDeckFilters) => ["vocabulary", "decks", filters] as const,
  detail: (slug: string) => ["vocabulary", "deck", slug] as const,
};

export function useVocabDecksQuery(filters: VocabDeckFilters) {
  return useQuery({
    queryKey: vocabQueryKeys.list(filters),
    queryFn: () => {
      const params = new URLSearchParams();
      if (filters.visibility) params.set("visibility", filters.visibility);
      if (filters.q) params.set("q", filters.q);
      params.set("page", String(filters.page ?? 1));
      return apiClient.request(`/vocabulary/decks?${params.toString()}`, {
        schema: vocabDeckListResponseSchema,
      });
    },
  });
}

export function useVocabDeckDetailQuery(slug: string) {
  return useQuery({
    queryKey: vocabQueryKeys.detail(slug),
    queryFn: () =>
      apiClient.request(`/vocabulary/decks/${encodeURIComponent(slug)}`, {
        schema: vocabDeckDetailResponseSchema,
      }),
    enabled: Boolean(slug),
  });
}

export function useCreateVocabDeckMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateVocabDeckRequest) => {
      const payload = createVocabDeckRequestSchema.parse(input);
      return apiClient.request("/vocabulary/decks", {
        method: "POST",
        body: payload,
        schema: createVocabDeckResponseSchema,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["vocabulary", "decks"] });
    },
  });
}
