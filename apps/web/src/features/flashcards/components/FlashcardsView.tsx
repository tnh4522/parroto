"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Eye, Layers, Lock, RotateCw, Volume2 } from "lucide-react";
import type { SrsRating } from "@linguacraft/contracts";
import {
  useSrsDueQuery,
  useSubmitSrsReviewMutation,
} from "@/features/flashcards/api/srs-api";
import { cn } from "@/shared/lib/cn";
import { useAuthStore } from "@/shared/stores/auth-store";
import { useGlobalUiStore } from "@/shared/stores/ui-store";
import { Badge } from "@/shared/ui/Badge";
import { Button, buttonVariants } from "@/shared/ui/Button";
import { Card, CardContent } from "@/shared/ui/Card";
import { EmptyState, ErrorState, LoadingState } from "@/shared/ui/StateBoundary";

const RATING_BUTTONS: {
  rating: SrsRating;
  label: string;
  hint: string;
  className: string;
}[] = [
  {
    rating: 1,
    label: "Again",
    hint: "Shortcut 1",
    className:
      "border-red-200 bg-red-50 text-red-800 hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300",
  },
  {
    rating: 2,
    label: "Hard",
    hint: "Shortcut 2",
    className:
      "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300",
  },
  {
    rating: 3,
    label: "Good",
    hint: "Shortcut 3",
    className:
      "border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300",
  },
  {
    rating: 4,
    label: "Easy",
    hint: "Shortcut 4",
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300",
  },
];

export function FlashcardsView({ deckSlug }: { deckSlug?: string }) {
  const authStatus = useAuthStore((s) => s.status);
  const openLoginModal = useGlobalUiStore((s) => s.openLoginModal);

  const dueQuery = useSrsDueQuery(20, deckSlug, authStatus === "authenticated");
  const reviewMutation = useSubmitSrsReviewMutation();

  const [reviewedIds, setReviewedIds] = useState<string[]>([]);
  const [isFlipped, setIsFlipped] = useState(false);
  const [lastScheduleNote, setLastScheduleNote] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const dueCards = dueQuery.data?.cards ?? [];
  const remainingCards = dueCards.filter((c) => !reviewedIds.includes(c.id));
  const activeCard = remainingCards[0] ?? null;

  const playPronunciation = (term: string, audioUrl?: string | null) => {
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      void audio.play().catch(() => {});
      return;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(term);
      utterance.lang = "en-US";
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleRate = useCallback(
    async (rating: SrsRating) => {
      if (!activeCard || reviewMutation.isPending) return;
      setReviewError(null);
      try {
        const result = await reviewMutation.mutateAsync({
          cardId: activeCard.id,
          rating,
        });
        setLastScheduleNote(
          `"${activeCard.term}" scheduled in ${result.intervalDays} day${
            result.intervalDays === 1 ? "" : "s"
          } (${result.state}).`
        );
        setReviewedIds((prev) => [...prev, activeCard.id]);
        setIsFlipped(false);
      } catch (err) {
        setReviewError(
          err instanceof Error ? err.message : "Failed to save flashcard review."
        );
      }
    },
    [activeCard, reviewMutation]
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!activeCard) return;
      if (event.code === "Space" && !isFlipped) {
        event.preventDefault();
        setIsFlipped(true);
      } else if (isFlipped && ["1", "2", "3", "4"].includes(event.key)) {
        event.preventDefault();
        void handleRate(Number(event.key) as SrsRating);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeCard, isFlipped, handleRate]);

  if (authStatus === "loading") {
    return <LoadingState label="Checking your session..." />;
  }

  if (authStatus === "guest") {
    return (
      <Card className="mx-auto max-w-xl">
        <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
          <Lock className="h-10 w-10 text-blue-600" aria-hidden="true" />
          <div className="space-y-1">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              Sign in for Spaced Repetition Flashcards
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              SM-2 memory scheduling syncs your due intervals across devices.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <Button
              variant="primary"
              onClick={() => openLoginModal("Sign in to review due flashcards.")}
            >
              Sign in
            </Button>
            <Link
              href="/vocabulary"
              className={buttonVariants({ variant: "outline" })}
            >
              Browse Vocabulary Decks
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (dueQuery.isLoading) {
    return <LoadingState label="Loading due flashcards..." />;
  }

  if (dueQuery.isError) {
    return (
      <ErrorState
        message={
          dueQuery.error instanceof Error
            ? dueQuery.error.message
            : "Failed to load due flashcards."
        }
        onRetry={() => void dueQuery.refetch()}
      />
    );
  }

  const totalDue = dueQuery.data?.dueCount ?? 0;

  if (!activeCard) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Flashcards (SM-2)
          </h1>
          <Link
            href="/vocabulary"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <Layers className="h-4 w-4" aria-hidden="true" />
            Browse Decks
          </Link>
        </div>

        <EmptyState
          title="All caught up!"
          description={
            reviewedIds.length > 0
              ? `You completed ${reviewedIds.length} review${
                  reviewedIds.length === 1 ? "" : "s"
                } in this session.`
              : "No vocabulary cards are currently due for review."
          }
          action={
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setReviewedIds([]);
                  void dueQuery.refetch();
                }}
              >
                <RotateCw className="h-4 w-4" aria-hidden="true" />
                Refresh Queue
              </Button>
              <Link href="/vocabulary" className={buttonVariants({ variant: "primary" })}>
                Explore Vocabulary
              </Link>
            </div>
          }
        />
      </div>
    );
  }

  const completedInBatch = reviewedIds.length;
  const totalInBatch = Math.max(1, dueCards.length);
  const progressPct = Math.round((completedInBatch / totalInBatch) * 100);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Flashcards Review
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {totalDue} due card{totalDue === 1 ? "" : "s"}
            {deckSlug ? ` · Deck: ${deckSlug}` : ""}
          </p>
        </div>
        <Link
          href="/vocabulary"
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          All Decks
        </Link>
      </div>

      {/* Session Progress */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs font-medium text-slate-600 dark:text-slate-400">
          <span>
            Session progress: {completedInBatch} / {dueCards.length}
          </span>
          <span>{progressPct}%</span>
        </div>
        <div
          className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
          role="progressbar"
          aria-label="Flashcards session progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progressPct}
        >
          <div
            className="h-full bg-blue-600 transition-[width] duration-150"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {lastScheduleNote ? (
        <div
          role="status"
          className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-medium text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{lastScheduleNote}</span>
        </div>
      ) : null}

      {/* Active Flashcard */}
      <Card className="overflow-hidden">
        <CardContent className="space-y-6 p-6 sm:p-8">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Badge variant="info">{activeCard.state}</Badge>
              <span className="text-xs text-slate-500">
                Interval: {activeCard.intervalDays}d · EF{" "}
                {activeCard.easeFactor.toFixed(2)}
              </span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label={`Pronounce ${activeCard.term}`}
              onClick={() => playPronunciation(activeCard.term, activeCard.audioUrl)}
            >
              <Volume2 className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>

          <div className="py-4 text-center">
            <p className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {activeCard.term}
            </p>
            {activeCard.phonetic ? (
              <p className="mt-1 font-mono text-sm text-slate-500 dark:text-slate-400">
                {activeCard.phonetic}
              </p>
            ) : null}
          </div>

          {!isFlipped ? (
            <div className="flex flex-col items-center gap-2 pt-2">
              <Button
                type="button"
                variant="primary"
                size="lg"
                onClick={() => setIsFlipped(true)}
              >
                <Eye className="h-4 w-4" aria-hidden="true" />
                Reveal Answer
              </Button>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Press Space to flip
              </span>
            </div>
          ) : (
            <div className="space-y-5 border-t border-slate-200 pt-5 dark:border-slate-800">
              <div className="space-y-2 text-center">
                {activeCard.partOfSpeech ? (
                  <Badge variant="default">{activeCard.partOfSpeech}</Badge>
                ) : null}
                <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {activeCard.meaning}
                </p>
                {activeCard.exampleSentence ? (
                  <p className="text-sm italic text-slate-600 dark:text-slate-400">
                    &ldquo;{activeCard.exampleSentence}&rdquo;
                  </p>
                ) : null}
              </div>

              {reviewError ? (
                <p role="alert" className="text-center text-xs font-medium text-red-600">
                  {reviewError}
                </p>
              ) : null}

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {RATING_BUTTONS.map((btn) => (
                  <button
                    key={btn.rating}
                    type="button"
                    disabled={reviewMutation.isPending}
                    onClick={() => void handleRate(btn.rating)}
                    className={cn(
                      "flex flex-col items-center rounded-xl border px-3 py-2.5 text-center transition-colors disabled:opacity-50",
                      btn.className
                    )}
                  >
                    <span className="text-sm font-bold">{btn.label}</span>
                    <span className="text-xs opacity-80">{btn.hint}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
