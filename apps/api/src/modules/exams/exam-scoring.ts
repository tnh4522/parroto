export function answersMatch(
  answerFormat: string,
  selectedValue: string | null | undefined,
  correctAnswer: string
): boolean {
  if (!selectedValue) return false;
  const cleanSelected = selectedValue.trim();
  const cleanCorrect = correctAnswer.trim();
  if (answerFormat === "single" || answerFormat === "MCQ") {
    return cleanSelected.toUpperCase() === cleanCorrect.toUpperCase();
  }
  return (
    cleanSelected.replace(/\s+/g, " ").toLowerCase() ===
    cleanCorrect.replace(/\s+/g, " ").toLowerCase()
  );
}

export function calculateIeltsBand(
  totalCorrect: number,
  totalQuestions: number
): number {
  const safeTotal = Math.max(1, totalQuestions);
  const scaled40 = (totalCorrect / safeTotal) * 40;
  let band = 4.0;
  if (scaled40 >= 39) band = 9.0;
  else if (scaled40 >= 37) band = 8.5;
  else if (scaled40 >= 35) band = 8.0;
  else if (scaled40 >= 32) band = 7.5;
  else if (scaled40 >= 30) band = 7.0;
  else if (scaled40 >= 26) band = 6.5;
  else if (scaled40 >= 23) band = 6.0;
  else if (scaled40 >= 18) band = 5.5;
  else if (scaled40 >= 15) band = 5.0;
  else if (scaled40 >= 12) band = 4.5;
  else band = Math.max(1.0, Math.round((scaled40 / 12) * 4.5 * 2) / 2);
  return band;
}

export function calculateToeicScaled(
  listeningCorrect: number,
  listeningTotal: number,
  readingCorrect: number,
  readingTotal: number
): { listening: number; reading: number; total: number } {
  const scaleSection = (correct: number, total: number) => {
    if (total <= 0) return 0;
    const raw = Math.round((correct / total) * 495);
    const snapped = Math.round(raw / 5) * 5;
    return Math.min(495, Math.max(5, snapped));
  };

  const listening = scaleSection(listeningCorrect, listeningTotal);
  const reading = scaleSection(readingCorrect, readingTotal);
  return {
    listening,
    reading,
    total: listening + reading,
  };
}
