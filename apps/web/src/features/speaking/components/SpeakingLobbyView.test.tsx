import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "@/shared/api/api-client";
import { useAuthStore } from "@/shared/stores/auth-store";
import { SpeakingLobbyView } from "./SpeakingLobbyView";

const ROOM_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

describe("SpeakingLobbyView", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useAuthStore.setState({
      accessToken: "tok",
      status: "authenticated",
      user: {
        id: "11111111-1111-4111-8111-111111111111",
        email: "speaker@example.com",
        username: "voice_user",
        displayName: "Voice User",
        role: "USER",
        entitlementTier: "FREE",
        ageVerified: true,
        preferredUiLocale: "en",
        preferredTranslateLang: "vi",
      },
    });
  });

  it("blocks room entry for unverified-age accounts cleanly", async () => {
    useAuthStore.setState((s) => ({
      ...s,
      user: s.user ? { ...s.user, ageVerified: false } : null,
    }));

    vi.spyOn(apiClient, "request").mockResolvedValueOnce({ items: [] });

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <SpeakingLobbyView />
      </QueryClientProvider>
    );

    expect(
      screen.getByText(/age verification is required before joining or hosting/i)
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create room/i })).toBeDisabled();
  });

  it("creates a new speaking room via POST /speaking/rooms and joins it", async () => {
    const user = userEvent.setup();
    const requestSpy = vi
      .spyOn(apiClient, "request")
      .mockImplementation(async (path) => {
        if (path.startsWith("/speaking/rooms?")) {
          return {
            items: [
              {
                id: ROOM_ID,
                name: "Coffee Chat B1",
                topic: "Daily Life",
                cefrLevel: "B1",
                maxParticipants: 4,
                currentParticipants: 2,
                isPrivate: false,
                hostDisplayName: "Alex",
                createdAt: "2026-11-24T08:00:00Z",
              },
            ],
          };
        }
        if (path === "/speaking/rooms") {
          return {
            room: {
              id: ROOM_ID,
              name: "IELTS Speaking Clinic",
              topic: "Daily Life",
              cefrLevel: "B1",
              maxParticipants: 4,
              currentParticipants: 1,
              isPrivate: false,
              hostDisplayName: "Voice User",
              createdAt: "2026-11-24T09:00:00Z",
            },
          };
        }
        return {};
      });

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <SpeakingLobbyView />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Coffee Chat B1")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /create room/i }));
    await user.type(screen.getByLabelText(/room name/i), "IELTS Speaking Clinic");
    await user.click(screen.getByRole("button", { name: /launch room/i }));

    await waitFor(() => {
      expect(requestSpy).toHaveBeenCalledWith(
        "/speaking/rooms",
        expect.objectContaining({
          method: "POST",
          body: expect.objectContaining({ name: "IELTS Speaking Clinic" }),
        })
      );
    });

    expect(screen.getByText("Live Room")).toBeInTheDocument();
  });
});
