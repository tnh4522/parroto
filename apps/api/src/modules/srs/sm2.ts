import type { SrsCardState, SrsRating } from "@linguacraft/contracts";

export interface Sm2PreviousState {
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
}

export interface Sm2NextState {
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  state: SrsCardState;
  nextReviewAt: Date;
}

export function calculateSm2NextState(
  prev: Sm2PreviousState,
  rating: SrsRating,
  now = new Date()
): Sm2NextState {
  let easeFactor = prev.easeFactor;
  let intervalDays = prev.intervalDays;
  let repetitions = prev.repetitions;
  let state: SrsCardState = "LEARNING";

  if (rating === 1) {
    repetitions = 0;
    intervalDays = 1;
    easeFactor = Math.max(1.3, Number((easeFactor - 0.2).toFixed(2)));
    state = "RELEARNING";
  } else if (rating === 2) {
    easeFactor = Math.max(1.3, Number((easeFactor - 0.14).toFixed(2)));
    intervalDays =
      repetitions === 0 ? 1 : Math.max(1, Math.round(intervalDays * 1.2));
    repetitions += 1;
    state = repetitions >= 2 ? "REVIEW" : "LEARNING";
  } else if (rating === 3) {
    if (repetitions === 0) {
      intervalDays = 1;
    } else if (repetitions === 1) {
      intervalDays = 6;
    } else {
      intervalDays = Math.max(1, Math.round(intervalDays * easeFactor));
    }
    repetitions += 1;
    state = repetitions >= 2 ? "REVIEW" : "LEARNING";
  } else {
    easeFactor = Number((easeFactor + 0.15).toFixed(2));
    if (repetitions === 0) {
      intervalDays = 4;
    } else if (repetitions === 1) {
      intervalDays = 8;
    } else {
      intervalDays = Math.max(1, Math.round(intervalDays * easeFactor * 1.3));
    }
    repetitions += 1;
    state = "REVIEW";
  }

  const nextReviewAt = new Date(
    now.getTime() + intervalDays * 24 * 60 * 60 * 1000
  );

  return {
    easeFactor,
    intervalDays,
    repetitions,
    state,
    nextReviewAt,
  };
}
