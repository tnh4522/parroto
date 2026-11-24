import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "@/shared/api/api-client";
import { useAuthStore } from "@/shared/stores/auth-store";
import { VocabDeckDetailView } from "./VocabDeckDetailView";
import { VocabularyLibraryView } from "./VocabularyLibraryView";

const DECK_ID = "77777777-7777-4777-8777-777777777777";
const CARD_ID = "88888888-8888-4888-8888-888888888888";

describe("Vocabulary Management Views", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useAuthStore.setState({
      accessToken: "tok",
      status: "authenticated",
      user: {
        id: "11111111-1111-4111-8111-111111111111",
        email: "user@example.com",
        username: "vocab_user",
        displayName: "Vocab User",
        role: "USER",
        entitlementTier: "FREE",
        ageVerified: true,
        preferredUiLocale: "en",
        preferredTranslateLang: "vi",
      },
    });
  });

  it("searches decks and creates a personal vocabulary deck via POST /vocabulary/decks", async () => {
    const user = userEvent.setup();
    const requestSpy = vi
      .spyOn(apiClient, "request")
      .mockImplementation(async (path) => {
        if (path.startsWith("/vocabulary/decks?")) {
          return {
            items: [
              {
                id: DECK_ID,
                slug: "academic-verbs",
                title: "Academic Verbs",
                description: "Core verbs for essays",
                cefrLevel: "B2",
                visibility: "PUBLIC",
                isPro: false,
                cardCount: 30,
              },
            ],
            pagination: { page: 1, limit: 12, total: 1, totalPages: 1 },
          };
        }
        if (path === "/vocabulary/decks") {
          return {
            deck: {
              id: DECK_ID,
              slug: "custom-ielts",
              title: "Custom IELTS",
              cefrLevel: "B1",
              visibility: "PRIVATE",
              isPro: false,
              cardCount: 1,
            },
          };
        }
        return {};
      });

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <VocabularyLibraryView />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Academic Verbs")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /new deck/i }));
    await user.type(screen.getByLabelText(/deck title/i), "Custom IELTS");
    await user.type(screen.getByLabelText(/card 1 term/i), "mitigate");
    await user.type(screen.getByLabelText(/card 1 meaning/i), "make less severe");
    await user.click(screen.getByRole("button", { name: /save deck/i }));

    await waitFor(() => {
      expect(requestSpy).toHaveBeenCalledWith(
        "/vocabulary/decks",
        expect.objectContaining({
          method: "POST",
          body: expect.objectContaining({
            title: "Custom IELTS",
            visibility: "PRIVATE",
          }),
        })
      );
    });
  });

  it("displays Pro preview gate on VocabDeckDetailView when totalCards exceeds previewCards", async () => {
    vi.spyOn(apiClient, "request").mockResolvedValueOnce({
      deck: {
        id: DECK_ID,
        slug: "advanced-idioms",
        title: "Advanced Idioms",
        cefrLevel: "C1",
        visibility: "PUBLIC",
        isPro: true,
        cardCount: 120,
      },
      previewCards: [
        {
          id: CARD_ID,
          term: "ubiquitous",
          phonetic: "/juːˈbɪk.wɪ.təs/",
          partOfSpeech: "adjective",
          meaning: "present everywhere",
          exampleSentence: "Smartphones have become ubiquitous.",
        },
      ],
      totalCards: 120,
    });

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <VocabDeckDetailView slug="advanced-idioms" />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("ubiquitous")).toBeInTheDocument();
    });
    expect(
      screen.getByText(/showing 1 preview cards out of 120 total cards/i)
    ).toBeInTheDocument();
  });
});
