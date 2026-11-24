import { expect, test } from "@playwright/test";

const LESSON_ID = "33333333-3333-4333-8333-333333333333";
const SENTENCE_ID = "44444444-4444-4444-8444-444444444441";
const EXAM_ID = "55555555-5555-4555-8555-555555555555";

test.describe("LinguaCraft End-to-End QA Suite", () => {
  test("Landing page renders with clean layout and zero horizontal overflow", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByRole("heading").first()).toBeVisible();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth
    );
    expect(overflow).toBe(false);
  });

  test("Responsive navigation: sidebar and mobile drawer work without overflow", async ({
    page,
    isMobile,
  }) => {
    await page.route("**/api/v1/auth/refresh", (route) =>
      route.fulfill({ status: 401, json: { statusCode: 401, code: "UNAUTHORIZED", message: "Guest" } })
    );
    await page.route("**/api/v1/lessons/daily", (route) =>
      route.fulfill({
        status: 200,
        json: { dateKey: "2026-11-24", items: [] },
      })
    );

    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: /learning dashboard/i })).toBeVisible();

    if (isMobile) {
      const openMenu = page.getByRole("button", { name: /open menu/i });
      await openMenu.click();
      await expect(page.getByRole("link", { name: /flashcards/i })).toBeVisible();
    } else {
      await expect(page.getByRole("link", { name: /flashcards/i })).toBeVisible();
    }

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth
    );
    expect(overflow).toBe(false);
  });

  test("Authentication flow validates email client-side and submits magic link", async ({
    page,
  }) => {
    await page.route("**/api/v1/auth/magic-link", (route) =>
      route.fulfill({ status: 200, json: { sent: true } })
    );

    await page.goto("/login");
    await page.getByLabel(/email/i).fill("invalid-email");
    await expect(
      page.getByRole("button", { name: /continue with email/i })
    ).toBeDisabled();
    await expect(page.getByText(/valid email/i)).toBeVisible();

    await page.getByLabel(/email/i).fill("qa@linguacraft.app");
    await page.getByRole("button", { name: /continue with email/i }).click();
    await expect(page.getByText(/check your inbox/i)).toBeVisible();
  });

  test("Auth boundaries protect flashcards, analytics, and settings for guests", async ({
    page,
  }) => {
    await page.route("**/api/v1/auth/refresh", (route) =>
      route.fulfill({ status: 401, json: { statusCode: 401, code: "UNAUTHORIZED", message: "Guest" } })
    );

    await page.goto("/flashcards");
    await expect(
      page.getByRole("heading", { name: /sign in for spaced repetition/i })
    ).toBeVisible();

    await page.goto("/analytics");
    await expect(
      page.getByRole("heading", { name: /sign in to view progress analytics/i })
    ).toBeVisible();

    await page.goto("/settings");
    await page.getByRole("button", { name: /dark mode/i }).click();
    await expect(page.getByRole("button", { name: /light mode/i })).toBeVisible();
  });

  test("Dictation practice evaluates input and transitions cleanly", async ({
    page,
  }) => {
    await page.route("**/api/v1/auth/refresh", (route) =>
      route.fulfill({ status: 401, json: { statusCode: 401, code: "UNAUTHORIZED", message: "Guest" } })
    );
    await page.route("**/api/v1/lessons/morning-routine", (route) =>
      route.fulfill({
        status: 200,
        json: {
          lesson: {
            id: LESSON_ID,
            slug: "morning-routine",
            title: "Morning Routine",
            description: "Free audio practice",
            mediaType: "AUDIO",
            cefrLevel: "A2",
            durationSec: 30,
            isPro: false,
            viewCount: 15,
            topics: ["daily-life"],
          },
          signedMediaUrl: "https://cdn.example.test/sample.mp3",
          sentences: [
            {
              id: SENTENCE_ID,
              orderIndex: 0,
              startMs: 0,
              endMs: 2500,
              text: "Hello world today",
              ipaText: "/həˈloʊ wɜːrld təˈdeɪ/",
              translations: { vi: "Xin chào thế giới hôm nay" },
            },
          ],
        },
      })
    );

    await page.goto("/dictation/morning-routine");
    await expect(page.getByText("Morning Routine")).toBeVisible();
    await page.getByLabel(/type what you hear/i).fill("Hello world today");
    await page.getByRole("button", { name: /check & submit/i }).click();
    await expect(page.getByText(/score: 100% \(passed\)/i)).toBeVisible();
  });

  test("Shadowing handles denied microphone permission cleanly", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "mediaDevices", {
        configurable: true,
        value: {
          getUserMedia: () =>
            Promise.reject(
              new DOMException("Permission denied", "NotAllowedError")
            ),
        },
      });
    });

    await page.route("**/api/v1/auth/refresh", (route) =>
      route.fulfill({ status: 401, json: { statusCode: 401, code: "UNAUTHORIZED", message: "Guest" } })
    );
    await page.route("**/api/v1/lessons/morning-routine", (route) =>
      route.fulfill({
        status: 200,
        json: {
          lesson: {
            id: LESSON_ID,
            slug: "morning-routine",
            title: "Morning Routine",
            mediaType: "AUDIO",
            cefrLevel: "A2",
            durationSec: 30,
            isPro: false,
            viewCount: 15,
            topics: ["daily-life"],
          },
          signedMediaUrl: "https://cdn.example.test/sample.mp3",
          sentences: [
            {
              id: SENTENCE_ID,
              orderIndex: 0,
              startMs: 0,
              endMs: 2500,
              text: "Good morning everyone",
            },
          ],
        },
      })
    );

    await page.goto("/shadowing/morning-routine");
    await expect(page.getByText("Morning Routine")).toBeVisible();
    await page.getByRole("button", { name: /^record$/i }).click();
    await expect(
      page.getByText(/microphone permission was denied/i)
    ).toBeVisible();
  });

  test("TOEIC exam overview dynamically updates question count and opens comment boundaries", async ({
    page,
  }) => {
    await page.route("**/api/v1/auth/refresh", (route) =>
      route.fulfill({ status: 401, json: { statusCode: 401, code: "UNAUTHORIZED", message: "Guest" } })
    );
    await page.route("**/api/v1/exams/ets-demo-1", (route) =>
      route.fulfill({
        status: 200,
        json: {
          exam: {
            id: EXAM_ID,
            slug: "ets-demo-1",
            title: "ETS Demo Test 1",
            track: "TOEIC",
            totalQuestions: 36,
            durationMinutes: 20,
            isFree: true,
            attemptsCount: 4,
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
        },
      })
    );
    await page.route("**/api/v1/comments*", (route) =>
      route.fulfill({
        status: 200,
        json: {
          items: [],
          pagination: { page: 1, limit: 10, total: 0, totalPages: 1 },
        },
      })
    );

    await page.goto("/exams/toeic/ets-demo-1");
    await expect(page.getByText("ETS Demo Test 1")).toBeVisible();
    await expect(page.getByText("36", { exact: true })).toBeVisible();

    await page.getByRole("checkbox").first().uncheck();
    await expect(page.getByText("30", { exact: true })).toBeVisible();
    await expect(page.getByText("15 min", { exact: true })).toBeVisible();
  });
});
