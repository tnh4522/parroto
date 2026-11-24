import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "@/shared/api/api-client";
import { useAuthStore } from "@/shared/stores/auth-store";
import { ExamOverviewView } from "./ExamOverviewView";
import { ExamSessionRunnerView } from "./ExamSessionRunnerView";

const pushSpy = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushSpy }),
}));

const EXAM_ID = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const SESSION_ID = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const GROUP_ID = "ffffffff-ffff-4fff-8fff-ffffffffffff";

describe("IELTS/TOEIC Exam Views", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    pushSpy.mockReset();
    useAuthStore.setState({
      accessToken: "tok",
      status: "authenticated",
      user: {
        id: "11111111-1111-4111-8111-111111111111",
        email: "candidate@example.com",
        username: "candidate1",
        displayName: "Candidate",
        role: "USER",
        entitlementTier: "FREE",
        ageVerified: true,
        preferredUiLocale: "en",
        preferredTranslateLang: "vi",
      },
    });
  });

  it("recalculates TOEIC part selection counts and starts a Practice session", async () => {
    const user = userEvent.setup();
    const requestSpy = vi
      .spyOn(apiClient, "request")
      .mockImplementation(async (path) => {
        if (path === "/exams/ets-2024-test-1") {
          return {
            exam: {
              id: EXAM_ID,
              slug: "ets-2024-test-1",
              title: "ETS Practice Test 1",
              track: "TOEIC",
              totalQuestions: 200,
              durationMinutes: 120,
              isFree: true,
              attemptsCount: 12,
            },
            parts: [
              {
                partNumber: 1,
                title: "Photographs",
                questionCount: 6,
                durationMinutes: 5,
                skill: "LISTENING",
              },
              {
                partNumber: 5,
                title: "Incomplete Sentences",
                questionCount: 30,
                durationMinutes: 15,
                skill: "READING",
              },
            ],
            userInProgressSessionId: null,
          };
        }
        if (path.startsWith("/comments")) {
          return {
            items: [],
            pagination: { page: 1, limit: 10, total: 0, totalPages: 1 },
          };
        }
        if (path === "/exams/sessions/start") {
          return {
            session: {
              id: SESSION_ID,
              examId: EXAM_ID,
              track: "TOEIC",
              mode: "PRACTICE",
              status: "IN_PROGRESS",
              selectedParts: [5],
              startedAt: "2026-11-24T09:00:00Z",
            },
          };
        }
        return {};
      });

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <ExamOverviewView track="TOEIC" slug="ets-2024-test-1" />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("ETS Practice Test 1")).toBeInTheDocument();
    });

    // Uncheck Part 1 (6 Qs), leaving Part 5 (30 Qs / 15 min)
    const checkboxes = screen.getAllByRole("checkbox");
    await user.click(checkboxes[0]!);
    expect(screen.getByText("30")).toBeInTheDocument();
    expect(screen.getByText("15 min")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /practice mode/i }));
    await user.click(screen.getByRole("button", { name: /start practice/i }));

    await waitFor(() => {
      expect(requestSpy).toHaveBeenCalledWith(
        "/exams/sessions/start",
        expect.objectContaining({
          method: "POST",
          body: {
            examId: EXAM_ID,
            mode: "PRACTICE",
            parts: [5],
          },
        })
      );
    });

    expect(pushSpy).toHaveBeenCalledWith(`/exams/toeic/session/${SESSION_ID}`);
  });

  it("allows checking practice answers inline and submitting session", async () => {
    const user = userEvent.setup();
    const requestSpy = vi
      .spyOn(apiClient, "request")
      .mockImplementation(async (path) => {
        if (path.startsWith(`/exams/sessions/${SESSION_ID}/questions`)) {
          return {
            session: {
              id: SESSION_ID,
              examId: EXAM_ID,
              track: "IELTS",
              mode: "PRACTICE",
              status: "IN_PROGRESS",
              selectedParts: [1],
              startedAt: "2026-11-24T09:00:00Z",
            },
            parts: [
              {
                partNumber: 1,
                title: "Reading Passage 1",
                questionCount: 1,
                skill: "READING",
              },
            ],
            groups: [
              {
                id: GROUP_ID,
                partNumber: 1,
                instruction: "Choose the best answer.",
                passageText: "Solar panels convert sunlight directly into electricity.",
                questions: [
                  {
                    questionNumber: 1,
                    partNumber: 1,
                    questionType: "MCQ",
                    promptText: "What do solar panels convert into electricity?",
                    options: [
                      { value: "A", label: "A. Wind energy" },
                      { value: "B", label: "B. Sunlight" },
                    ],
                  },
                ],
              },
            ],
            savedAnswers: {},
          };
        }
        if (path === `/exams/sessions/${SESSION_ID}/answers`) {
          return { savedCount: 1, updatedAt: "2026-11-24T09:01:00Z" };
        }
        if (path === `/exams/sessions/${SESSION_ID}/check/1`) {
          return {
            isCorrect: true,
            correctAnswer: "B",
            explanationHtml: "<p>Passage directly states <b>sunlight</b>.</p>",
          };
        }
        if (path === `/exams/sessions/${SESSION_ID}/submit`) {
          return {
            sessionResult: {
              id: SESSION_ID,
              examId: EXAM_ID,
              examSlug: "cambridge-18-1",
              examTitle: "Cambridge 18 Test 1",
              track: "IELTS",
              mode: "PRACTICE",
              status: "COMPLETED",
              scoreDisplay: "9.0",
              accuracyPct: 100,
              startedAt: "2026-11-24T09:00:00Z",
              completedAt: "2026-11-24T09:02:00Z",
            },
          };
        }
        return {};
      });

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <ExamSessionRunnerView track="IELTS" sessionId={SESSION_ID} />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(
        screen.getByText(/what do solar panels convert/i)
      ).toBeInTheDocument();
    });

    await user.click(screen.getByLabelText("B. Sunlight"));
    await user.click(screen.getByRole("button", { name: /check answer/i }));

    await waitFor(() => {
      expect(screen.getByText(/correct! \(b\)/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/passage directly states sunlight/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /submit test/i }));

    await waitFor(() => {
      expect(requestSpy).toHaveBeenCalledWith(
        `/exams/sessions/${SESSION_ID}/submit`,
        expect.objectContaining({ method: "POST" })
      );
    });
    expect(pushSpy).toHaveBeenCalledWith(`/exams/ielts/result/${SESSION_ID}`);
  });
});
