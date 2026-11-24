import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createSpeakingRoomRequestSchema,
  createSpeakingRoomResponseSchema,
  speakingRoomListResponseSchema,
  type CefrLevel,
  type CreateSpeakingRoomRequest,
} from "@linguacraft/contracts";
import { apiClient } from "@/shared/api/api-client";

export interface SpeakingRoomFilters {
  cefrLevel?: CefrLevel | "";
  topic?: string;
}

export const speakingQueryKeys = {
  rooms: (filters: SpeakingRoomFilters) =>
    ["speaking", "rooms", filters] as const,
};

export function useSpeakingRoomsQuery(filters: SpeakingRoomFilters) {
  return useQuery({
    queryKey: speakingQueryKeys.rooms(filters),
    queryFn: () => {
      const params = new URLSearchParams();
      if (filters.cefrLevel) params.set("cefrLevel", filters.cefrLevel);
      if (filters.topic) params.set("topic", filters.topic);
      return apiClient.request(`/speaking/rooms?${params.toString()}`, {
        schema: speakingRoomListResponseSchema,
      });
    },
  });
}

export function useCreateSpeakingRoomMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateSpeakingRoomRequest) => {
      const payload = createSpeakingRoomRequestSchema.parse(input);
      return apiClient.request("/speaking/rooms", {
        method: "POST",
        body: payload,
        schema: createSpeakingRoomResponseSchema,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["speaking", "rooms"] });
    },
  });
}
