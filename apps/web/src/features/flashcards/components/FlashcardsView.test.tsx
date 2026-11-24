import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "@/shared/api/api-client";
import { useAuthStore } from "@/shared/stores/auth-store";
import { FlashcardsView } from "./FlashcardsView";

const CARD_ID = "99999999-9999-4999-8999-999999999999";

describe("FlashcardsView (SM-2)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useAuthStore.setState({
      accessToken: "tok",
      status: "authenticated",
      user: {
        id: "11111111-1111-4111-8111-111111111111",
        email: "srs@example.com",
        username: "srs_learner",
        displayName: "SRS Learner",
        role: "USER",
        entitlementTier: "FREE",
        ageVerified: true,
        preferredUiLocale: "en",
        preferredTranslateLang: "vi",
      },
    });
  });

  it("loads due flashcards, reveals answer, and submits SM-2 review rating", async () => {
    const user = userEvent.setup();
    const requestSpy = vi
      .spyOn(apiClient, "request")
      .mockImplementation(async (path) => {
        if (path.startsWith("/srs/due")) {
          return {
            dueCount: 1,
            cards: [
              {
                id: CARD_ID,
                term: "resilient",
                phonetic: "/rɪˈzɪl.jənt/",
                partOfSpeech: "adjective",
                meaning: "able to recover quickly from difficulties",
                exampleSentence: "Local communities proved remarkably resilient.",
                intervalDays: 0,
                easeFactor: 2.5,
                repetitions: 0,
                state: "NEW",
                nextReviewAt: "2026-11-24T00:00:00Z",
              },
            ],
          };
        }
        if (path === "/srs/reviews") {
          return {
            nextReviewAt: "2026-11-25T00:00:00Z",
            intervalDays: 1,
            easeFactor: 2.6,
            state: "LEARNING",
          };
        }
        return {};
      });

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <FlashcardsView />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("resilient")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /reveal answer/i }));
    expect(
      screen.getByText("able to recover quickly from difficulties")
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /good/i }));

    await waitFor(() => {
      expect(requestSpy).toHaveBeenCalledWith(
        "/srs/reviews",
        expect.objectContaining({
          method: "POST",
          body: { cardId: CARD_ID, rating: 3 },
        })
      );
    });

    expect(screen.getByText(/all caught up!/i)).toBeInTheDocument();
  });

  it("prompts guest users to sign in before querying /srs/due", async () => {
    useAuthStore.setState({ accessToken: null, status: "guest", user: null });
    const requestSpy = vi.spyOn(apiClient, "request");

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <FlashcardsView />
      </QueryClientProvider>
    );

    expect(
      screen.getByText(/sign in for spaced repetition flashcards/i)
    ).toBeInTheDocument();
    expect(requestSpy).not.toHaveBeenCalled();
  });
});
