import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "@/shared/api/api-client";
import { useAuthStore } from "@/shared/stores/auth-store";
import { LessonLibraryView } from "./LessonLibraryView";

describe("LessonLibraryView", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useAuthStore.setState({
      accessToken: "tok",
      status: "authenticated",
      user: {
        id: "11111111-1111-4111-8111-111111111111",
        email: "pro@example.com",
        username: "pro_user",
        displayName: "Pro User",
        role: "USER",
        entitlementTier: "PRO",
        ageVerified: true,
        preferredUiLocale: "en",
        preferredTranslateLang: "vi",
      },
    });
  });

  it("queries /lessons with CEFR filter and queues YouTube import for PRO users", async () => {
    const user = userEvent.setup();
    const requestSpy = vi.spyOn(apiClient, "request").mockImplementation(async (path) => {
      if (path.startsWith("/lessons?")) {
        return {
          items: [
            {
              id: "33333333-3333-4333-8333-333333333333",
              slug: "daily-standup",
              title: "Daily Standup Meeting",
              description: "Business conversation.",
              mediaType: "VIDEO",
              cefrLevel: "B2",
              durationSec: 90,
              isPro: false,
              viewCount: 42,
              topics: ["business"],
            },
          ],
          pagination: { page: 1, limit: 12, total: 1, totalPages: 1 },
        };
      }
      if (path === "/lessons/import-youtube") {
        return {
          jobId: "job-123",
          lessonId: "44444444-4444-4444-8444-444444444444",
        };
      }
      return {};
    });

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <LessonLibraryView />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Daily Standup Meeting")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "B2" }));
    await waitFor(() => {
      expect(requestSpy).toHaveBeenCalledWith(
        expect.stringContaining("level=B2"),
        expect.anything()
      );
    });

    await user.type(
      screen.getByLabelText(/youtube video url/i),
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    );
    await user.click(screen.getByRole("button", { name: /create lesson/i }));

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(/job-123/i);
    });
  });
});
