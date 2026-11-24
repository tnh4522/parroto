import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "@/shared/api/api-client";
import { useAuthStore } from "@/shared/stores/auth-store";
import { DictationWorkspace } from "./DictationWorkspace";

const LESSON_ID = "33333333-3333-4333-8333-333333333333";
const SENTENCE_1_ID = "44444444-4444-4444-8444-444444444441";
const SENTENCE_2_ID = "44444444-4444-4444-8444-444444444442";

function renderWithQuery(slug: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <DictationWorkspace slug={slug} />
    </QueryClientProvider>
  );
}

describe("DictationWorkspace", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useAuthStore.setState({
      accessToken: "tok",
      status: "authenticated",
      user: {
        id: "11111111-1111-4111-8111-111111111111",
        email: "learner@example.com",
        username: "learner1",
        displayName: "Learner One",
        role: "USER",
        entitlementTier: "FREE",
        ageVerified: true,
        preferredUiLocale: "en",
        preferredTranslateLang: "vi",
      },
    });
  });

  it("evaluates typed dictation, submits attempt to API, and navigates sentences", async () => {
    const user = userEvent.setup();
    const requestSpy = vi
      .spyOn(apiClient, "request")
      .mockImplementation(async (path) => {
        if (path === "/lessons/morning-routine") {
          return {
            lesson: {
              id: LESSON_ID,
              slug: "morning-routine",
              title: "Morning Routine",
              description: "Daily English conversation.",
              mediaType: "AUDIO",
              cefrLevel: "A2",
              durationSec: 45,
              isPro: false,
              viewCount: 10,
              topics: ["daily-life"],
            },
            signedMediaUrl: "https://cdn.example.com/audio.mp3",
            sentences: [
              {
                id: SENTENCE_1_ID,
                orderIndex: 0,
                startMs: 0,
                endMs: 3200,
                text: "Hello world today",
                ipaText: "/həˈloʊ wɜːrld təˈdeɪ/",
                translations: { vi: "Xin chào thế giới hôm nay" },
              },
              {
                id: SENTENCE_2_ID,
                orderIndex: 1,
                startMs: 3300,
                endMs: 6500,
                text: "Let us begin.",
              },
            ],
          };
        }
        if (path === `/lessons/${LESSON_ID}/attempts`) {
          return {
            passed: true,
            sentenceScore: 100,
            diamondsEarned: 5,
            streakUpdated: true,
          };
        }
        return {};
      });

    renderWithQuery("morning-routine");

    await waitFor(() => {
      expect(screen.getByText("Morning Routine")).toBeInTheDocument();
    });

    expect(screen.getByText("Sentence 1 / 2")).toBeInTheDocument();

    const textarea = screen.getByLabelText(/type what you hear/i);
    await user.type(textarea, "Hello world today");

    await user.click(screen.getByRole("button", { name: /check & submit/i }));

    await waitFor(() => {
      expect(requestSpy).toHaveBeenCalledWith(
        `/lessons/${LESSON_ID}/attempts`,
        expect.objectContaining({
          method: "POST",
          body: expect.objectContaining({
            sentenceId: SENTENCE_1_ID,
            mode: "DICTATION",
            accuracyScore: 100,
          }),
        })
      );
    });

    expect(screen.getByText(/\+5 Diamonds/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^next$/i }));
    expect(screen.getByText("Sentence 2 / 2")).toBeInTheDocument();
  });

  it("renders locked Pro gate when backend redacts sentences on Pro lessons", async () => {
    vi.spyOn(apiClient, "request").mockResolvedValueOnce({
      lesson: {
        id: LESSON_ID,
        slug: "executive-briefing",
        title: "Executive Briefing",
        description: "Pro business dialogue.",
        mediaType: "VIDEO",
        cefrLevel: "C1",
        durationSec: 240,
        isPro: true,
        viewCount: 99,
        topics: ["business"],
      },
      signedMediaUrl: null,
      sentences: null,
    });

    renderWithQuery("executive-briefing");

    await waitFor(() => {
      expect(screen.getByText("Executive Briefing")).toBeInTheDocument();
    });

    expect(screen.getByText(/available on linguacraft pro/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /browse free lessons/i })
    ).toBeInTheDocument();
  });
});
