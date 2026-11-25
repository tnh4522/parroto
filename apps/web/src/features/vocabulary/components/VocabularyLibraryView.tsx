"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { BookOpen, Plus, Search, Sparkles, X } from "lucide-react";
import {
  cefrLevelSchema,
  createVocabDeckRequestSchema,
  type CefrLevel,
  type VocabVisibility,
} from "@linguacraft/contracts";
import {
  useCreateVocabDeckMutation,
  useVocabDecksQuery,
} from "@/features/vocabulary/api/vocabulary-api";
import { cn } from "@/shared/lib/cn";
import { useAuthStore } from "@/shared/stores/auth-store";
import { useGlobalUiStore } from "@/shared/stores/ui-store";
import { Badge } from "@/shared/ui/Badge";
import { Button, buttonVariants } from "@/shared/ui/Button";
import { Card, CardContent, CardHeader } from "@/shared/ui/Card";
import { DataPagination } from "@/shared/ui/DataPagination";
import { Input } from "@/shared/ui/Input";
import { EmptyState, ErrorState, LoadingState } from "@/shared/ui/StateBoundary";

interface DraftCard {
  term: string;
  meaning: string;
  exampleSentence: string;
}

export function VocabularyLibraryView() {
  const authStatus = useAuthStore((s) => s.status);
  const openLoginModal = useGlobalUiStore((s) => s.openLoginModal);

  const [visibility, setVisibility] = useState<VocabVisibility | "">("");
  const [searchInput, setSearchInput] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [page, setPage] = useState(1);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deckTitle, setDeckTitle] = useState("");
  const [deckDesc, setDeckDesc] = useState("");
  const [deckLevel, setDeckLevel] = useState<CefrLevel>("B1");
  const [draftCards, setDraftCards] = useState<DraftCard[]>([
    { term: "", meaning: "", exampleSentence: "" },
  ]);
  const [createError, setCreateError] = useState<string | null>(null);

  const decksQuery = useVocabDecksQuery({
    visibility,
    q: submittedSearch || undefined,
    page,
  });

  const createDeckMutation = useCreateVocabDeckMutation();

  const handleSearchSubmit = (event: FormEvent) => {
    event.preventDefault();
    setSubmittedSearch(searchInput.trim());
    setPage(1);
  };

  const handleOpenCreate = () => {
    if (authStatus === "guest") {
      openLoginModal("Sign in to create and save custom vocabulary decks.");
      return;
    }
    setIsCreateOpen(true);
  };

  const handleAddDraftCard = () => {
    setDraftCards((prev) => [
      ...prev,
      { term: "", meaning: "", exampleSentence: "" },
    ]);
  };

  const handleCreateDeckSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setCreateError(null);

    const parsed = createVocabDeckRequestSchema.safeParse({
      title: deckTitle,
      description: deckDesc.trim() || undefined,
      cefrLevel: deckLevel,
      visibility: "PRIVATE",
      cards: draftCards
        .filter((c) => c.term.trim() || c.meaning.trim())
        .map((c) => ({
          term: c.term.trim(),
          meaning: c.meaning.trim(),
          exampleSentence: c.exampleSentence.trim() || undefined,
        })),
    });

    if (!parsed.success) {
      setCreateError(
        parsed.error.issues[0]?.message ?? "Please complete the deck details."
      );
      return;
    }

    try {
      await createDeckMutation.mutateAsync(parsed.data);
      setIsCreateOpen(false);
      setDeckTitle("");
      setDeckDesc("");
      setDraftCards([{ term: "", meaning: "", exampleSentence: "" }]);
    } catch (err) {
      setCreateError(
        err instanceof Error ? err.message : "Could not create vocabulary deck."
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Vocabulary Decks
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Explore curated word sets or organize your personal flashcards.
          </p>
        </div>

        <Button type="button" variant="primary" onClick={handleOpenCreate}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          New Deck
        </Button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { value: "", label: "All Decks" },
              { value: "PUBLIC", label: "Public" },
              { value: "PRIVATE", label: "My Decks" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.label}
              type="button"
              onClick={() => {
                if (tab.value === "PRIVATE" && authStatus === "guest") {
                  openLoginModal("Sign in to view your personal vocabulary decks.");
                  return;
                }
                setVisibility(tab.value);
                setPage(1);
              }}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                visibility === tab.value
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-500"
              aria-hidden="true"
            />
            <input
              type="search"
              aria-label="Search vocabulary decks"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search decks..."
              className="h-10 w-56 rounded-xl border-2 border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-500 focus-visible:border-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-400"
            />
          </div>
          <Button type="submit" variant="outline" size="sm">
            Search
          </Button>
        </form>
      </div>

      {/* Create Deck Drawer/Form */}
      {isCreateOpen ? (
        <Card className="border-blue-300 dark:border-blue-800">
          <CardHeader className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Create Personal Deck
            </h2>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label="Close deck form"
              onClick={() => setIsCreateOpen(false)}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </Button>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => void handleCreateDeckSubmit(e)} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block space-y-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
                  <span>Deck Title</span>
                  <Input
                    value={deckTitle}
                    onChange={(e) => setDeckTitle(e.target.value)}
                    placeholder="e.g. Academic Writing Verbs"
                  />
                </label>
                <label className="block space-y-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
                  <span>CEFR Level</span>
                  <select
                    value={deckLevel}
                    onChange={(e) => setDeckLevel(cefrLevelSchema.parse(e.target.value))}
                    className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
                  >
                    {cefrLevelSchema.options.map((lvl) => (
                      <option key={lvl} value={lvl}>
                        {lvl}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="block space-y-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
                <span>Description (optional)</span>
                <Input
                  value={deckDesc}
                  onChange={(e) => setDeckDesc(e.target.value)}
                  placeholder="High-frequency phrases for essays..."
                />
              </label>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Cards ({draftCards.length})
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddDraftCard}
                  >
                    Add Card
                  </Button>
                </div>

                {draftCards.map((card, idx) => (
                  <div
                    key={idx}
                    className="grid gap-2 rounded-xl border border-slate-200 p-3 sm:grid-cols-[1fr_1fr_1fr_auto] dark:border-slate-800"
                  >
                    <input
                      type="text"
                      aria-label={`Card ${idx + 1} term`}
                      placeholder="Term (e.g. mitigate)"
                      value={card.term}
                      onChange={(e) =>
                        setDraftCards((prev) =>
                          prev.map((item, i) =>
                            i === idx ? { ...item, term: e.target.value } : item
                          )
                        )
                      }
                      className="h-9 rounded-lg border border-slate-300 px-2.5 text-sm placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:placeholder:text-slate-400"
                    />
                    <input
                      type="text"
                      aria-label={`Card ${idx + 1} meaning`}
                      placeholder="Meaning"
                      value={card.meaning}
                      onChange={(e) =>
                        setDraftCards((prev) =>
                          prev.map((item, i) =>
                            i === idx ? { ...item, meaning: e.target.value } : item
                          )
                        )
                      }
                      className="h-9 rounded-lg border border-slate-300 px-2.5 text-sm placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:placeholder:text-slate-400"
                    />
                    <input
                      type="text"
                      aria-label={`Card ${idx + 1} example`}
                      placeholder="Example sentence (optional)"
                      value={card.exampleSentence}
                      onChange={(e) =>
                        setDraftCards((prev) =>
                          prev.map((item, i) =>
                            i === idx
                              ? { ...item, exampleSentence: e.target.value }
                              : item
                          )
                        )
                      }
                      className="h-9 rounded-lg border border-slate-300 px-2.5 text-sm placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:placeholder:text-slate-400"
                    />
                    {draftCards.length > 1 ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Remove card ${idx + 1}`}
                        onClick={() =>
                          setDraftCards((prev) => prev.filter((_, i) => i !== idx))
                        }
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    ) : null}
                  </div>
                ))}
              </div>

              {createError ? (
                <p role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">
                  {createError}
                </p>
              ) : null}

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsCreateOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={createDeckMutation.isPending}
                >
                  Save Deck
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {/* Deck Listing */}
      {decksQuery.isLoading ? (
        <LoadingState label="Loading vocabulary decks..." />
      ) : decksQuery.isError ? (
        <ErrorState
          message={
            decksQuery.error instanceof Error
              ? decksQuery.error.message
              : "Failed to load vocabulary decks."
          }
          onRetry={() => void decksQuery.refetch()}
        />
      ) : !decksQuery.data || decksQuery.data.items.length === 0 ? (
        <EmptyState
          title="No vocabulary decks found"
          description="Try another keyword or create your first custom vocabulary deck."
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {decksQuery.data.items.map((deck) => (
              <Card
                key={deck.id}
                className="flex h-full flex-col justify-between transition-colors hover:border-blue-400/70"
              >
                <CardContent className="flex flex-1 flex-col justify-between gap-4 p-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <Badge variant="info">{deck.cefrLevel}</Badge>
                        {deck.isPro ? (
                          <Badge variant="pro">
                            <Sparkles className="h-3 w-3" aria-hidden="true" />
                            PRO
                          </Badge>
                        ) : (
                          <Badge variant="default">{deck.visibility}</Badge>
                        )}
                      </div>
                      <span className="text-xs font-semibold text-slate-500">
                        {deck.cardCount} words
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {deck.title}
                    </h3>
                    {deck.description ? (
                      <p className="line-clamp-2 text-xs text-slate-600 dark:text-slate-400">
                        {deck.description}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <Link
                      href={`/vocabulary/${encodeURIComponent(deck.slug)}`}
                      className={buttonVariants({
                        variant: "outline",
                        size: "sm",
                        className: "flex-1",
                      })}
                    >
                      <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                      Inspect Words
                    </Link>
                    <Link
                      href={`/flashcards?deck=${encodeURIComponent(deck.slug)}`}
                      className={buttonVariants({ variant: "primary", size: "sm" })}
                    >
                      Study
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <DataPagination
            page={decksQuery.data.pagination.page}
            totalPages={decksQuery.data.pagination.totalPages}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}
