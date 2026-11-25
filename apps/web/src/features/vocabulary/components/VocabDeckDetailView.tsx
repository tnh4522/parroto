"use client";

import Link from "next/link";
import { ArrowLeft, Lock, Sparkles, Volume2 } from "lucide-react";
import { useVocabDeckDetailQuery } from "@/features/vocabulary/api/vocabulary-api";
import { useAuthStore } from "@/shared/stores/auth-store";
import { useGlobalUiStore } from "@/shared/stores/ui-store";
import { Badge } from "@/shared/ui/Badge";
import { Button, buttonVariants } from "@/shared/ui/Button";
import { Card, CardContent } from "@/shared/ui/Card";
import { EmptyState, ErrorState, LoadingState } from "@/shared/ui/StateBoundary";

export function VocabDeckDetailView({ slug }: { slug: string }) {
  const authStatus = useAuthStore((s) => s.status);
  const openLoginModal = useGlobalUiStore((s) => s.openLoginModal);
  const openDictionaryModal = useGlobalUiStore((s) => s.openDictionaryModal);

  const detailQuery = useVocabDeckDetailQuery(slug);

  const playWordAudio = (term: string, audioUrl?: string | null) => {
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      void audio.play().catch(() => {
        // Ignore browser autoplay rejection
      });
      return;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(term);
      utterance.lang = "en-US";
      window.speechSynthesis.speak(utterance);
    }
  };

  if (detailQuery.isLoading) {
    return <LoadingState label="Loading vocabulary deck..." />;
  }

  if (detailQuery.isError) {
    return (
      <ErrorState
        message={
          detailQuery.error instanceof Error
            ? detailQuery.error.message
            : "Could not load vocabulary deck."
        }
        onRetry={() => void detailQuery.refetch()}
      />
    );
  }

  if (!detailQuery.data) {
    return <EmptyState title="Vocabulary deck not found" />;
  }

  const { deck, previewCards, totalCards } = detailQuery.data;
  const hasLockedRemainder = deck.isPro && totalCards > previewCards.length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <Link
            href="/vocabulary"
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-blue-600 dark:text-slate-400"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Vocabulary Library
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {deck.title}
            </h1>
            <Badge variant="info">{deck.cefrLevel}</Badge>
            {deck.isPro ? (
              <Badge variant="pro">
                <Sparkles className="h-3 w-3" aria-hidden="true" />
                PRO
              </Badge>
            ) : null}
          </div>
          {deck.description ? (
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {deck.description}
            </p>
          ) : null}
        </div>

        <Link
          href={`/flashcards?deck=${encodeURIComponent(deck.slug)}`}
          className={buttonVariants({ variant: "primary" })}
        >
          Practice in Flashcards
        </Link>
      </div>

      {hasLockedRemainder ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-sm dark:border-amber-900/60 dark:bg-amber-950/30">
          <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200">
            <Lock className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              Showing {previewCards.length} preview cards out of {totalCards} total cards.
              Full Pro deck access requires an entitled account.
            </span>
          </div>
          {authStatus === "guest" ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => openLoginModal("Sign in to access full Pro vocabulary decks.")}
            >
              Sign in
            </Button>
          ) : null}
        </div>
      ) : null}

      {previewCards.length === 0 ? (
        <EmptyState title="No vocabulary cards in this deck yet" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {previewCards.map((card) => (
            <Card key={card.id}>
              <CardContent className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <button
                      type="button"
                      onClick={() => openDictionaryModal(card.term)}
                      className="text-left text-base font-bold text-slate-900 hover:text-blue-600 dark:text-white"
                    >
                      {card.term}
                    </button>
                    {card.phonetic ? (
                      <p className="font-mono text-xs text-slate-500">{card.phonetic}</p>
                    ) : null}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label={`Pronounce ${card.term}`}
                    onClick={() => playWordAudio(card.term, card.audioUrl)}
                  >
                    <Volume2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>

                {card.partOfSpeech ? (
                  <Badge variant="default">{card.partOfSpeech}</Badge>
                ) : null}

                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                  {card.meaning}
                </p>

                {card.exampleSentence ? (
                  <p className="text-xs italic text-slate-600 dark:text-slate-400">
                    &ldquo;{card.exampleSentence}&rdquo;
                  </p>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
