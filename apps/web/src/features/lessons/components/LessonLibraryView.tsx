"use client";

import { useState, type FormEvent } from "react";
import { Sparkles, Youtube } from "lucide-react";
import {
  cefrLevelSchema,
  importYoutubeLessonRequestSchema,
  type CefrLevel,
} from "@linguacraft/contracts";
import { ApiClientError } from "@/shared/api/client";
import { useAuthStore } from "@/shared/stores/auth-store";
import { useGlobalUiStore } from "@/shared/stores/ui-store";
import { Badge } from "@/shared/ui/Badge";
import { Button } from "@/shared/ui/Button";
import { Card, CardContent } from "@/shared/ui/Card";
import { DataPagination } from "@/shared/ui/DataPagination";
import { Input } from "@/shared/ui/Input";
import { EmptyState, ErrorState, LoadingState } from "@/shared/ui/StateBoundary";
import {
  useImportYoutubeLessonMutation,
  useLessonListQuery,
} from "../api/lessons-api";
import { LessonCard } from "./LessonCard";

const CEFR_LEVELS: readonly CefrLevel[] = cefrLevelSchema.options;

export function LessonLibraryView({
  defaultMode = "",
  heading = "Lesson Library",
  subheading = "Filter listening and speaking clips by CEFR level or topic.",
}: {
  defaultMode?: "DICTATION" | "SHADOWING" | "";
  heading?: string;
  subheading?: string;
}) {
  const [topic, setTopic] = useState("");
  const [level, setLevel] = useState<CefrLevel | "">("");
  const [mode, setMode] = useState<"DICTATION" | "SHADOWING" | "">(defaultMode);
  const [page, setPage] = useState(1);

  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [importValidationError, setImportValidationError] = useState<string | null>(null);

  const user = useAuthStore((s) => s.user);
  const status = useAuthStore((s) => s.status);
  const openLoginModal = useGlobalUiStore((s) => s.openLoginModal);

  const lessonsQuery = useLessonListQuery({
    topic: topic.trim() || undefined,
    level: level || undefined,
    mode: mode || undefined,
    page,
    limit: 12,
  });
  const importMutation = useImportYoutubeLessonMutation();

  const isAuth = status === "authenticated" && Boolean(user);
  const hasPro =
    user?.entitlementTier === "PRO" || user?.entitlementTier === "LIFETIME";

  async function handleImportSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setImportValidationError(null);

    if (!isAuth) {
      openLoginModal("Sign in to import a YouTube lesson.");
      return;
    }
    if (!hasPro) {
      setImportValidationError("Active PRO entitlement is required for AI lesson import.");
      return;
    }

    const parsed = importYoutubeLessonRequestSchema.safeParse({ youtubeUrl });
    if (!parsed.success) {
      setImportValidationError(
        parsed.error.issues[0]?.message ?? "Enter a valid YouTube URL"
      );
      return;
    }

    await importMutation.mutateAsync(parsed.data.youtubeUrl);
    setYoutubeUrl("");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
          {heading}
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">{subheading}</p>
      </div>

      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Youtube className="h-5 w-5 text-red-600" aria-hidden="true" />
              <h2 className="text-sm font-bold">Import Custom YouTube Lesson</h2>
              <Badge variant="pro">
                <Sparkles className="h-3 w-3" aria-hidden="true" />
                PRO AI
              </Badge>
            </div>
            {!isAuth ? (
              <span className="text-xs text-slate-500">Sign in required</span>
            ) : !hasPro ? (
              <span className="text-xs text-amber-600 dark:text-amber-400">
                Requires PRO plan
              </span>
            ) : null}
          </div>

          <form onSubmit={handleImportSubmit} className="flex flex-col gap-2 sm:flex-row">
            <Input
              aria-label="YouTube video URL"
              placeholder="Paste a YouTube link to generate synced subtitles..."
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
            />
            <Button
              type="submit"
              isLoading={importMutation.isPending}
              className="shrink-0"
            >
              Create Lesson
            </Button>
          </form>

          {importValidationError ? (
            <p role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">
              {importValidationError}
            </p>
          ) : importMutation.isError ? (
            <p role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">
              {importMutation.error instanceof ApiClientError
                ? importMutation.error.message
                : importMutation.error.message}
            </p>
          ) : importMutation.isSuccess ? (
            <p role="status" className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              Ingestion queued (Job {importMutation.data.jobId}). Your lesson will appear
              once AI transcription finishes.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <section
        aria-label="Lesson filters"
        className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="flex flex-wrap items-center gap-2">
          <div className="min-w-[200px] flex-1">
            <Input
              aria-label="Filter by topic"
              placeholder="Filter by topic tag (e.g. travel, ielts)..."
              value={topic}
              onChange={(e) => {
                setTopic(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <div className="flex items-center gap-1" role="group" aria-label="Practice mode">
            {(["", "DICTATION", "SHADOWING"] as const).map((item) => (
              <Button
                key={item || "all-modes"}
                variant={mode === item ? "primary" : "outline"}
                size="sm"
                onClick={() => {
                  setMode(item);
                  setPage(1);
                }}
              >
                {item === "" ? "All Modes" : item === "DICTATION" ? "Dictation" : "Shadowing"}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="CEFR level">
          <Button
            variant={level === "" ? "primary" : "outline"}
            size="sm"
            onClick={() => {
              setLevel("");
              setPage(1);
            }}
          >
            All Levels
          </Button>
          {CEFR_LEVELS.map((lvl) => (
            <Button
              key={lvl}
              variant={level === lvl ? "primary" : "outline"}
              size="sm"
              onClick={() => {
                setLevel(lvl);
                setPage(1);
              }}
            >
              {lvl}
            </Button>
          ))}
        </div>
      </section>

      {lessonsQuery.isLoading ? (
        <LoadingState label="Loading lessons..." />
      ) : lessonsQuery.isError ? (
        <ErrorState
          message={lessonsQuery.error.message}
          onRetry={() => void lessonsQuery.refetch()}
        />
      ) : lessonsQuery.data && lessonsQuery.data.items.length > 0 ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {lessonsQuery.data.items.map((lesson) => (
              <LessonCard key={lesson.id} lesson={lesson} />
            ))}
          </div>
          <DataPagination
            page={lessonsQuery.data.pagination.page}
            totalPages={lessonsQuery.data.pagination.totalPages}
            onPageChange={setPage}
          />
        </div>
      ) : (
        <EmptyState
          title="No matching lessons"
          description="Try clearing the topic tag or choosing another CEFR level."
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setTopic("");
                setLevel("");
                setMode(defaultMode);
                setPage(1);
              }}
            >
              Reset filters
            </Button>
          }
        />
      )}
    </div>
  );
}
