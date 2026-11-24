import type { z } from "zod";
import type { assessedWordSchema } from "@linguacraft/contracts";

export type AssessedWord = z.infer<typeof assessedWordSchema>;

export interface SpokenWordSpan {
  word: string;
  startMs: number;
  endMs: number;
  confidence?: number;
}

function normalizeToken(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/^[^a-z0-9']+|[^a-z0-9']+$/g, "")
    .replace(/['’]/g, "'");
}

/**
 * Deterministic Levenshtein edit-distance DP alignment between spoken word timestamps
 * and an expected reference transcript. Used when a provider supplies transcript/word
 * timings without acoustic phoneme scores (never fabricates phoneme arrays).
 */
export function alignSpokenWordsToReference(
  referenceText: string | null | undefined,
  spokenWords: readonly SpokenWordSpan[],
  durationMs: number
): {
  words: AssessedWord[];
  accuracyScore: number;
  completenessScore: number;
  fluencyScore: number;
  wordsPerMinute: number;
} {
  const safeDurationMs = Math.max(500, durationMs);
  const wordsPerMinute = Math.round(
    (spokenWords.length / (safeDurationMs / 1000)) * 60
  );

  if (!referenceText || !referenceText.trim()) {
    const words: AssessedWord[] = spokenWords.map((sw) => ({
      word: sw.word,
      startMs: sw.startMs,
      endMs: sw.endMs,
      accuracyScore: Math.round((sw.confidence ?? 0.88) * 100),
      errorType: "NONE",
      phonemes: null,
    }));
    const avgScore =
      words.length > 0
        ? Math.round(
            words.reduce((sum, w) => sum + w.accuracyScore, 0) / words.length
          )
        : 0;
    const fluencyScore =
      wordsPerMinute >= 100 && wordsPerMinute <= 170
        ? 88
        : wordsPerMinute > 0
          ? 74
          : 0;

    return {
      words,
      accuracyScore: avgScore,
      completenessScore: words.length > 0 ? 100 : 0,
      fluencyScore,
      wordsPerMinute,
    };
  }

  const refTokens = referenceText
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((raw) => ({ raw, norm: normalizeToken(raw) }))
    .filter((item) => item.norm.length > 0);

  if (refTokens.length === 0) {
    return {
      words: [],
      accuracyScore: 100,
      completenessScore: 100,
      fluencyScore: 85,
      wordsPerMinute,
    };
  }

  const spokenNorms = spokenWords.map((sw) => ({
    ...sw,
    norm: normalizeToken(sw.word),
  }));

  const m = refTokens.length;
  const n = spokenNorms.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array<number>(n + 1).fill(0)
  );

  for (let i = 0; i <= m; i += 1) dp[i]![0] = i;
  for (let j = 0; j <= n; j += 1) dp[0]![j] = j;

  for (let i = 1; i <= m; i += 1) {
    for (let j = 1; j <= n; j += 1) {
      const cost =
        refTokens[i - 1]!.norm === spokenNorms[j - 1]!.norm ? 0 : 1;
      dp[i]![j] = Math.min(
        dp[i - 1]![j]! + 1,
        dp[i]![j - 1]! + 1,
        dp[i - 1]![j - 1]! + cost
      );
    }
  }

  const aligned: AssessedWord[] = [];
  let i = m;
  let j = n;
  let matchedCount = 0;

  while (i > 0 || j > 0) {
    if (
      i > 0 &&
      j > 0 &&
      refTokens[i - 1]!.norm === spokenNorms[j - 1]!.norm &&
      dp[i]![j] === dp[i - 1]![j - 1]
    ) {
      const sp = spokenNorms[j - 1]!;
      matchedCount += 1;
      aligned.push({
        word: refTokens[i - 1]!.raw,
        startMs: sp.startMs,
        endMs: sp.endMs,
        accuracyScore: Math.round((sp.confidence ?? 0.92) * 100),
        errorType: "NONE",
        phonemes: null,
      });
      i -= 1;
      j -= 1;
    } else if (i > 0 && j > 0 && dp[i]![j] === dp[i - 1]![j - 1]! + 1) {
      const sp = spokenNorms[j - 1]!;
      aligned.push({
        word: refTokens[i - 1]!.raw,
        startMs: sp.startMs,
        endMs: sp.endMs,
        accuracyScore: 45,
        errorType: "MISPRONUNCIATION",
        phonemes: null,
      });
      i -= 1;
      j -= 1;
    } else if (i > 0 && dp[i]![j] === dp[i - 1]![j]! + 1) {
      aligned.push({
        word: refTokens[i - 1]!.raw,
        startMs: 0,
        endMs: 0,
        accuracyScore: 0,
        errorType: "OMISSION",
        phonemes: null,
      });
      i -= 1;
    } else if (j > 0) {
      const sp = spokenNorms[j - 1]!;
      aligned.push({
        word: sp.word,
        startMs: sp.startMs,
        endMs: sp.endMs,
        accuracyScore: 50,
        errorType: "INSERTION",
        phonemes: null,
      });
      j -= 1;
    }
  }

  aligned.reverse();

  const completenessScore = Math.round((matchedCount / m) * 100);
  const wordMean = Math.round(
    aligned.reduce((sum, w) => sum + w.accuracyScore, 0) / Math.max(1, aligned.length)
  );
  const fluencyScore =
    wordsPerMinute >= 100 && wordsPerMinute <= 170
      ? Math.min(95, Math.round((wordMean + 88) / 2))
      : Math.round(wordMean * 0.85);

  return {
    words: aligned,
    accuracyScore: wordMean,
    completenessScore,
    fluencyScore,
    wordsPerMinute,
  };
}
