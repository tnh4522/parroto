export type DictationDifficulty = "EASY" | "NORMAL" | "HARD";

export interface DictationToken {
  raw: string;
  normalized: string;
  index: number;
}

export type WordMatchStatus = "matched" | "mismatch" | "pending" | "revealed";

export interface DictationEvaluationResult {
  accuracyScore: number;
  mistakesCount: number;
  matchedCount: number;
  totalWords: number;
  allMatched: boolean;
  statuses: WordMatchStatus[];
}

export function normalizeWordToken(word: string): string {
  return word
    .toLowerCase()
    .replace(/^[^a-z0-9']+|[^a-z0-9']+$/g, "")
    .replace(/['’]/g, "'");
}

export function tokenizeSentence(text: string): DictationToken[] {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((raw, index) => ({
      raw,
      normalized: normalizeWordToken(raw),
      index,
    }));
}

export function maskDictationToken(
  token: DictationToken,
  difficulty: DictationDifficulty
): string {
  const clean = token.normalized;
  if (!clean) return token.raw;
  if (difficulty === "EASY") {
    const first = clean.charAt(0);
    const rest = "_".repeat(Math.max(1, clean.length - 1));
    return `${first}${rest}`;
  }
  if (difficulty === "NORMAL") {
    return "_".repeat(Math.max(2, clean.length));
  }
  return "•••";
}

export function evaluateDictationInput(
  targetText: string,
  typedText: string,
  revealedIndices: ReadonlySet<number>,
  hintPenaltyCount: number
): DictationEvaluationResult {
  const targetTokens = tokenizeSentence(targetText);
  const typedTokens = tokenizeSentence(typedText);

  if (targetTokens.length === 0) {
    return {
      accuracyScore: 100,
      mistakesCount: 0,
      matchedCount: 0,
      totalWords: 0,
      allMatched: true,
      statuses: [],
    };
  }

  let matchedCount = 0;
  let mismatches = 0;

  const statuses: WordMatchStatus[] = targetTokens.map((target, idx) => {
    if (revealedIndices.has(idx)) {
      return "revealed";
    }
    const typed = typedTokens[idx];
    if (!typed) {
      return "pending";
    }
    if (typed.normalized === target.normalized) {
      matchedCount += 1;
      return "matched";
    }
    mismatches += 1;
    return "mismatch";
  });

  const totalWords = targetTokens.length;
  const totalMistakes = mismatches + hintPenaltyCount;
  const rawScore = Math.round(
    ((matchedCount - hintPenaltyCount * 0.5) / totalWords) * 100
  );
  const accuracyScore = Math.max(0, Math.min(100, rawScore));

  return {
    accuracyScore,
    mistakesCount: totalMistakes,
    matchedCount,
    totalWords,
    allMatched: matchedCount + revealedIndices.size === totalWords && mismatches === 0,
    statuses,
  };
}
