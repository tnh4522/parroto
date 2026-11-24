import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { evaluateShadowingTranscript } from "@/features/audio-engine/phoneme-aligner";
import { apiClient } from "@/shared/api/api-client";
import { useAuthStore } from "@/shared/stores/auth-store";
import { ShadowingWorkspace } from "./ShadowingWorkspace";

const LESSON_ID = "55555555-5555-4555-8555-555555555555";
const SENTENCE_ID = "66666666-6666-4666-8666-666666666661";

describe("ShadowingWorkspace & phoneme alignment", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useAuthStore.setState({
      accessToken: "tok",
      status: "authenticated",
      user: {
        id: "11111111-1111-4111-8111-111111111111",
        email: "speaker@example.com",
        username: "speaker1",
        displayName: "Speaker One",
        role: "USER",
        entitlementTier: "FREE",
        ageVerified: true,
        preferredUiLocale: "en",
        preferredTranslateLang: "vi",
      },
    });
  });

  it("scores spoken words against expected sentence with IPA timings", () => {
    const res = evaluateShadowingTranscript("Good morning everyone", "good morning", [
      { word: "Good", startMs: 0, endMs: 400, ipa: "/ɡʊd/" },
      { word: "morning", startMs: 400, endMs: 900, ipa: "/ˈmɔːrnɪŋ/" },
      { word: "everyone", startMs: 900, endMs: 1500, ipa: "/ˈevriwʌn/" },
    ]);

    expect(res.accuracyScore).toBe(67);
    expect(res.mistakesCount).toBe(1);
    expect(res.wordFeedback[0]?.status).toBe("matched");
    expect(res.wordFeedback[2]?.status).toBe("missing");
    expect(res.wordFeedback[0]?.ipa).toBe("/ɡʊd/");
  });

  it("handles mic permission denial gracefully on Record click", async () => {
    const user = userEvent.setup();

    vi.spyOn(apiClient, "request").mockResolvedValueOnce({
      lesson: {
        id: LESSON_ID,
        slug: "coffee-order",
        title: "Ordering Coffee",
        mediaType: "AUDIO",
        cefrLevel: "A1",
        durationSec: 30,
        isPro: false,
        viewCount: 5,
        topics: ["travel"],
      },
      signedMediaUrl: "https://cdn.example.com/coffee.mp3",
      sentences: [
        {
          id: SENTENCE_ID,
          orderIndex: 0,
          startMs: 0,
          endMs: 2400,
          text: "I would like a black coffee.",
          ipaText: "/aɪ wʊd laɪk ə blæk ˈkɔːfi/",
        },
      ],
    });

    Object.defineProperty(globalThis.navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: vi
          .fn()
          .mockRejectedValue(new DOMException("Permission denied", "NotAllowedError")),
      },
    });
    Object.defineProperty(globalThis, "MediaRecorder", {
      configurable: true,
      value: class FakeMediaRecorder {
        static isTypeSupported() {
          return true;
        }
      },
    });

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <ShadowingWorkspace slug="coffee-order" />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Ordering Coffee")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /^record$/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/microphone permission was denied/i)
      ).toBeInTheDocument();
    });
  });
});
