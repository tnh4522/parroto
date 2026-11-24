import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "@/shared/api/api-client";
import { useAuthStore } from "@/shared/stores/auth-store";
import { useGlobalUiStore } from "@/shared/stores/ui-store";
import { DashboardView } from "./DashboardView";

describe("DashboardView", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useAuthStore.setState({ accessToken: null, user: null, status: "guest" });
    useGlobalUiStore.setState({ isLoginModalOpen: false, loginReason: null });
  });

  it("renders featured daily lessons and prompts login on guest check-in", async () => {
    const user = userEvent.setup();
    vi.spyOn(apiClient, "request").mockResolvedValueOnce({
      dateKey: "2026-11-24",
      items: [
        {
          id: "22222222-2222-4222-8222-222222222222",
          slug: "travel-upgrade",
          title: "Airline Upgrade Conversation",
          description: "Practice realistic travel dialogue.",
          mediaType: "AUDIO",
          cefrLevel: "B1",
          durationSec: 125,
          isPro: false,
          viewCount: 100,
          topics: ["travel"],
        },
      ],
    });

    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={qc}>
        <DashboardView />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Airline Upgrade Conversation")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /daily check-in/i }));
    expect(useGlobalUiStore.getState().isLoginModalOpen).toBe(true);
  });

  it("renders error state when daily lessons fail to load", async () => {
    vi.spyOn(apiClient, "request").mockRejectedValueOnce(new Error("Network offline"));

    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={qc}>
        <DashboardView />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Network offline")).toBeInTheDocument();
    });
  });
});
