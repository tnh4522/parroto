import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "@/shared/api/api-client";
import { useAuthStore } from "@/shared/stores/auth-store";
import { AnalyticsDashboardView } from "./AnalyticsDashboardView";

const EXAM_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const SESSION_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

describe("AnalyticsDashboardView", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useAuthStore.setState({
      accessToken: "tok",
      status: "authenticated",
      user: {
        id: "11111111-1111-4111-8111-111111111111",
        email: "stat@example.com",
        username: "stat_user",
        displayName: "Stat User",
        role: "USER",
        entitlementTier: "FREE",
        ageVerified: true,
        preferredUiLocale: "en",
        preferredTranslateLang: "vi",
        stats: {
          xpTotal: 1450,
          level: 5,
          diamondBalance: 60,
          currentStreakDays: 7,
          longestStreakDays: 14,
          streakFreezesOwned: 1,
          activeTimeSec: 3600,
        },
      },
    });
  });

  it("renders score trends and switches between IELTS and TOEIC tracks", async () => {
    const user = userEvent.setup();
    const requestSpy = vi
      .spyOn(apiClient, "request")
      .mockImplementation(async (path) => {
        if (path === "/exams/analytics?track=IELTS") {
          return {
            summary: {
              totalCompleted: 2,
              averageScore: 7.0,
              bestScore: 7.5,
              totalStudyMinutes: 90,
            },
            scoreTrend: [
              {
                sessionId: SESSION_ID,
                examTitle: "Cambridge 18 Test 1",
                score: 7.5,
                completedAt: "2026-11-23T10:00:00Z",
              },
            ],
            topWeakAreas: [
              { tag: "Matching Headings", accuracyPct: 50, questionCount: 8 },
            ],
          };
        }
        if (path === "/exams/analytics?track=TOEIC") {
          return {
            summary: {
              totalCompleted: 1,
              averageScore: 810,
              bestScore: 810,
              totalStudyMinutes: 120,
            },
            scoreTrend: [
              {
                sessionId: SESSION_ID,
                examTitle: "ETS Test 1",
                score: 810,
                completedAt: "2026-11-22T10:00:00Z",
              },
            ],
            topWeakAreas: [],
          };
        }
        if (path.startsWith("/exams/history")) {
          return {
            items: [
              {
                id: SESSION_ID,
                examId: EXAM_ID,
                examSlug: "cam-18-test-1",
                examTitle: "Cambridge 18 Test 1",
                track: path.includes("TOEIC") ? "TOEIC" : "IELTS",
                mode: "TEST",
                status: "COMPLETED",
                scoreDisplay: path.includes("TOEIC") ? "810" : "7.5",
                accuracyPct: 82,
                startedAt: "2026-11-23T09:00:00Z",
                completedAt: "2026-11-23T10:00:00Z",
              },
            ],
            pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
          };
        }
        return {};
      });

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <AnalyticsDashboardView />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/matching headings/i)).toBeInTheDocument();
    });
    expect(screen.getByText("7 days")).toBeInTheDocument();
    expect(screen.getByText("Lv 5 · 1450 XP")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "TOEIC" }));

    await waitFor(() => {
      expect(requestSpy).toHaveBeenCalledWith(
        "/exams/analytics?track=TOEIC",
        expect.anything()
      );
    });
  });
});
