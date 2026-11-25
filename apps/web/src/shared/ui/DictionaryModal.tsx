"use client";

import { useQuery } from "@tanstack/react-query";
import {
  dictionarySearchResponseSchema,
  dictionaryWordResponseSchema,
} from "@linguacraft/contracts";
import { Search, Volume2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { apiClient } from "@/shared/api/api-client";
import { useGlobalUiStore } from "@/shared/stores/ui-store";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { EmptyState, ErrorState, LoadingState } from "@/shared/ui/StateBoundary";
import { Badge } from "@/shared/ui/Badge";

export function DictionaryModal() {
  const isOpen = useGlobalUiStore((s) => s.isDictionaryModalOpen);
  const initialWord = useGlobalUiStore((s) => s.dictionaryInitialWord);
  const close = useGlobalUiStore((s) => s.closeDictionaryModal);
  const [queryText, setQueryText] = useState(initialWord);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setQueryText(initialWord);
      setSelectedWord(null);
      requestAnimationFrame(() => inputRef.current?.focus());
    } else if (previousFocusRef.current) {
      previousFocusRef.current.focus();
      previousFocusRef.current = null;
    }
  }, [isOpen, initialWord]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, close]);

  const trimmed = (queryText || initialWord).trim();

  const searchQuery = useQuery({
    queryKey: ["dictionary", "search", trimmed],
    queryFn: () =>
      apiClient.request(
        `/dictionary/search?q=${encodeURIComponent(trimmed)}&locale=en`,
        { schema: dictionarySearchResponseSchema }
      ),
    enabled: isOpen && trimmed.length >= 1,
  });

  const detailQuery = useQuery({
    queryKey: ["dictionary", "word", selectedWord],
    queryFn: () =>
      apiClient.request(
        `/dictionary/words/${encodeURIComponent(selectedWord ?? "")}`,
        { schema: dictionaryWordResponseSchema }
      ),
    enabled: isOpen && Boolean(selectedWord),
  });

  if (!isOpen) return null;

  function playPronunciation(audioUrl: string) {
    const audio = new Audio(audioUrl);
    void audio.play().catch(() => {});
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="dict-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
    >
      <div className="flex max-h-[85vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border-2 border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <h2 id="dict-modal-title" className="text-base font-bold">
            English Dictionary
          </h2>
          <Button variant="ghost" size="icon" aria-label="Close dictionary" onClick={close}>
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>

        <div className="border-b border-slate-100 p-4 dark:border-slate-800">
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-3 left-3 h-4 w-4 text-slate-500"
              aria-hidden="true"
            />
            <Input
              ref={inputRef}
              aria-label="Search English word"
              className="pl-9"
              placeholder="Search an English word..."
              value={queryText}
              onChange={(e) => {
                setQueryText(e.target.value);
                setSelectedWord(null);
              }}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {trimmed.length === 0 ? (
            <EmptyState
              title="Look up any word"
              description="Type an English term to inspect phonetics, audio pronunciation, and definitions."
            />
          ) : searchQuery.isLoading ? (
            <LoadingState label="Searching dictionary..." />
          ) : searchQuery.isError ? (
            <ErrorState
              message={searchQuery.error.message}
              onRetry={() => void searchQuery.refetch()}
            />
          ) : selectedWord ? (
            detailQuery.isLoading ? (
              <LoadingState label={`Loading "${selectedWord}"...`} />
            ) : detailQuery.isError ? (
              <ErrorState
                message={detailQuery.error.message}
                onRetry={() => void detailQuery.refetch()}
              />
            ) : detailQuery.data ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-extrabold">{detailQuery.data.word}</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedWord(null)}
                  >
                    Back to results
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {detailQuery.data.phonetics.map((item, idx) => (
                    <Button
                      key={`${item.locale}-${idx}`}
                      variant="secondary"
                      size="sm"
                      disabled={!item.audioUrl}
                      onClick={() => item.audioUrl && playPronunciation(item.audioUrl)}
                    >
                      <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
                      <span className="uppercase">{item.locale}</span>
                      <span className="font-mono text-xs">{item.ipa}</span>
                    </Button>
                  ))}
                </div>
                <div className="space-y-3">
                  {detailQuery.data.meanings.map((meaning, idx) => (
                    <div
                      key={`${meaning.partOfSpeech}-${idx}`}
                      className="rounded-xl border border-slate-200 p-3 dark:border-slate-800"
                    >
                      <Badge variant="info" className="mb-1.5">
                        {meaning.partOfSpeech}
                      </Badge>
                      <p className="text-sm text-slate-800 dark:text-slate-200">
                        {meaning.definition}
                      </p>
                      {meaning.example ? (
                        <p className="mt-1 text-xs italic text-slate-500">
                          &ldquo;{meaning.example}&rdquo;
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null
          ) : searchQuery.data?.items.length ? (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {searchQuery.data.items.map((item) => (
                <li key={item.word}>
                  <button
                    type="button"
                    onClick={() => setSelectedWord(item.word)}
                    className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60"
                  >
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {item.word}
                      </span>
                      {item.phonetic ? (
                        <span className="ml-2 font-mono text-xs text-slate-500">
                          {item.phonetic}
                        </span>
                      ) : null}
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        {item.shortMeaning}
                      </p>
                    </div>
                    {item.partOfSpeech ? <Badge>{item.partOfSpeech}</Badge> : null}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              title="No matching entries"
              description={`No dictionary entries matched "${trimmed}".`}
            />
          )}
        </div>
      </div>
    </div>
  );
}
