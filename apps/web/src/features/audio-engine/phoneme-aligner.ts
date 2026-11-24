import type { WordTiming } from "@linguacraft/contracts";
import { normalizeWordToken } from "@/features/dictation/lib/dictation-engine";

export type PhonemeWordStatus = "matched" | "mismatch" | "missing";

export interface WordPronunciationFeedback {
  expectedWord: string;
  normalizedExpected: string;
  spokenWord: string | null;
  ipa: string | null;
  status: PhonemeWordStatus;
}

export interface ShadowingEvaluationResult {
  accuracyScore: number;
  mistakesCount: number;
  wordFeedback: WordPronunciationFeedback[];
}

export function evaluateShadowingTranscript(
  expectedText: string,
  spokenTranscript: string,
  wordTimings?: readonly WordTiming[]
): ShadowingEvaluationResult {
  const expectedWords = expectedText.trim().split(/\s+/).filter(Boolean);
  const spokenNormalized = spokenTranscript
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => ({ raw: w, norm: normalizeWordToken(w) }))
    .filter((item) => item.norm.length > 0);

  if (expectedWords.length === 0) {
    return {
      accuracyScore: 100,
      mistakesCount: 0,
      wordFeedback: [],
    };
  }

  let matchedCount = 0;
  let mistakesCount = 0;
  let spokenCursor = 0;

  const wordFeedback: WordPronunciationFeedback[] = expectedWords.map((raw, idx) => {
    const normExpected = normalizeWordToken(raw);
    const ipa = wordTimings?.[idx]?.ipa ?? null;

    const currentSpoken = spokenNormalized[spokenCursor];
    if (currentSpoken && currentSpoken.norm === normExpected) {
      spokenCursor += 1;
      matchedCount += 1;
      return {
        expectedWord: raw,
        normalizedExpected: normExpected,
        spokenWord: currentSpoken.raw,
        ipa,
        status: "matched",
      };
    }

    // Look ahead one word in case an extra filler word was spoken
    const lookahead = spokenNormalized[spokenCursor + 1];
    if (lookahead && lookahead.norm === normExpected) {
      spokenCursor += 2;
      matchedCount += 1;
      return {
        expectedWord: raw,
        normalizedExpected: normExpected,
        spokenWord: lookahead.raw,
        ipa,
        status: "matched",
      };
    }

    mistakesCount += 1;
    if (currentSpoken) {
      spokenCursor += 1;
      return {
        expectedWord: raw,
        normalizedExpected: normExpected,
        spokenWord: currentSpoken.raw,
        ipa,
        status: "mismatch",
      };
    }

    return {
      expectedWord: raw,
      normalizedExpected: normExpected,
      spokenWord: null,
      ipa,
      status: "missing",
    };
  });

  const accuracyScore = Math.max(
    0,
    Math.min(100, Math.round((matchedCount / expectedWords.length) * 100))
  );

  return {
    accuracyScore,
    mistakesCount,
    wordFeedback,
  };
}

export interface BrowserSpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

export function createBrowserSpeechRecognizer(): BrowserSpeechRecognitionLike | null {
  if (typeof window === "undefined") return null;
  const win = window as unknown as {
    SpeechRecognition?: new () => BrowserSpeechRecognitionLike;
    webkitSpeechRecognition?: new () => BrowserSpeechRecognitionLike;
  };
  const Ctor = win.SpeechRecognition ?? win.webkitSpeechRecognition;
  if (!Ctor) return null;
  const instance = new Ctor();
  instance.lang = "en-US";
  instance.interimResults = false;
  instance.maxAlternatives = 1;
  return instance;
}
