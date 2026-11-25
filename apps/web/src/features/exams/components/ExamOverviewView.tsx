"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  Clock,
  Lock,
  MessageSquare,
  Play,
  Sparkles,
} from "lucide-react";
import type { ExamMode, ExamTrack } from "@linguacraft/contracts";
import {
  useExamCommentsQuery,
  useExamOverviewQuery,
  usePostExamCommentMutation,
  useStartExamSessionMutation,
} from "@/features/exams/api/exams-api";
import { cn } from "@/shared/lib/cn";
import { useAuthStore } from "@/shared/stores/auth-store";
import { useGlobalUiStore } from "@/shared/stores/ui-store";
import { Badge } from "@/shared/ui/Badge";
import { Button, buttonVariants } from "@/shared/ui/Button";
import { Card, CardContent, CardHeader } from "@/shared/ui/Card";
import { DataPagination } from "@/shared/ui/DataPagination";
import { EmptyState, ErrorState, LoadingState } from "@/shared/ui/StateBoundary";

export function ExamOverviewView({
  track,
  slug,
}: {
  track: ExamTrack;
  slug: string;
}) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const authStatus = useAuthStore((s) => s.status);
  const openLoginModal = useGlobalUiStore((s) => s.openLoginModal);

  const trackLower = track.toLowerCase();
  const overviewQuery = useExamOverviewQuery(slug);
  const startMutation = useStartExamSessionMutation();

  const [mode, setMode] = useState<ExamMode>("TEST");
  const [selectedParts, setSelectedParts] = useState<number[]>([]);
  const [partsInitialized, setPartsInitialized] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const [commentPage, setCommentPage] = useState(1);
  const [commentText, setCommentText] = useState("");

  const examId = overviewQuery.data?.exam.id ?? "";
  const commentsQuery = useExamCommentsQuery(examId, commentPage);
  const postCommentMutation = usePostExamCommentMutation(examId);

  useEffect(() => {
    if (overviewQuery.data && !partsInitialized) {
      setSelectedParts(overviewQuery.data.parts.map((p) => p.partNumber));
      setPartsInitialized(true);
    }
  }, [overviewQuery.data, partsInitialized]);

  if (overviewQuery.isLoading) {
    return <LoadingState label="Loading exam overview..." />;
  }

  if (overviewQuery.isError) {
    return (
      <ErrorState
        message={
          overviewQuery.error instanceof Error
            ? overviewQuery.error.message
            : "Failed to load exam overview."
        }
        onRetry={() => void overviewQuery.refetch()}
      />
    );
  }

  if (!overviewQuery.data) {
    return <EmptyState title="Exam not found" />;
  }

  const { exam, parts, userInProgressSessionId } = overviewQuery.data;

  const isProLocked =
    !exam.isFree &&
    user?.entitlementTier !== "PRO" &&
    user?.entitlementTier !== "LIFETIME";

  const activePartsList = parts.filter((p) => selectedParts.includes(p.partNumber));
  const selectedQuestionCount = activePartsList.reduce(
    (sum, p) => sum + p.questionCount,
    0
  );
  const estimatedMinutes = activePartsList.reduce(
    (sum, p) => sum + (p.durationMinutes ?? Math.ceil(p.questionCount * 0.6)),
    0
  );

  const togglePart = (partNumber: number) => {
    setSelectedParts((prev) =>
      prev.includes(partNumber)
        ? prev.filter((n) => n !== partNumber)
        : [...prev, partNumber].sort((a, b) => a - b)
    );
  };

  const handleStartExam = async () => {
    setStartError(null);
    if (authStatus === "guest") {
      openLoginModal("Sign in to start an exam attempt and save results.");
      return;
    }
    if (isProLocked) {
      setStartError("Upgrade to Pro to unlock this exam test.");
      return;
    }
    if (selectedParts.length === 0) {
      setStartError("Select at least one part to start.");
      return;
    }

    try {
      const res = await startMutation.mutateAsync({
        examId: exam.id,
        mode,
        parts: track === "TOEIC" ? selectedParts : undefined,
      });
      router.push(
        `/exams/${trackLower}/session/${encodeURIComponent(res.session.id)}`
      );
    } catch (err) {
      setStartError(
        err instanceof Error ? err.message : "Could not start exam session."
      );
    }
  };

  const handlePostComment = async (event: FormEvent) => {
    event.preventDefault();
    if (authStatus === "guest") {
      openLoginModal("Sign in to join exam discussions.");
      return;
    }
    if (!commentText.trim()) return;
    await postCommentMutation.mutateAsync(commentText);
    setCommentText("");
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link
          href={`/exams/${trackLower}`}
          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-blue-600 dark:text-slate-400"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Back to {track} Library
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {exam.title}
          </h1>
          <Badge variant="info">{exam.track}</Badge>
          {exam.isFree ? (
            <Badge variant="success">Free</Badge>
          ) : (
            <Badge variant="pro">
              <Sparkles className="h-3 w-3" aria-hidden="true" />
              PRO
            </Badge>
          )}
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {exam.totalQuestions} questions · {exam.durationMinutes} minutes full exam
        </p>
      </div>

      {/* Resume Existing Session Banner */}
      {userInProgressSessionId ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm dark:border-blue-900/60 dark:bg-blue-950/30">
          <span className="font-medium text-blue-950 dark:text-blue-100">
            You have an active session in progress for this exam.
          </span>
          <Link
            href={`/exams/${trackLower}/session/${encodeURIComponent(userInProgressSessionId)}`}
            className={buttonVariants({ variant: "primary", size: "sm" })}
          >
            Resume Session
          </Link>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Parts & Configuration */}
        <div className="space-y-4 lg:col-span-8">
          <Card>
            <CardHeader className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {track === "TOEIC" ? "Select TOEIC Parts (1–7)" : "Exam Sections"}
              </h2>
              {track === "TOEIC" ? (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedParts(parts.map((p) => p.partNumber))}
                  >
                    Select All
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedParts([])}
                  >
                    Clear
                  </Button>
                </div>
              ) : null}
            </CardHeader>

            <CardContent className="space-y-2">
              {parts.map((part) => {
                const checked = selectedParts.includes(part.partNumber);
                return (
                  <label
                    key={part.partNumber}
                    className={cn(
                      "flex items-center justify-between rounded-xl border p-3 transition-colors",
                      track === "TOEIC" ? "cursor-pointer" : "",
                      checked
                        ? "border-blue-200 bg-blue-50/40 dark:border-blue-900/50 dark:bg-blue-950/20"
                        : "border-slate-200 dark:border-slate-800"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      {track === "TOEIC" ? (
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => togglePart(part.partNumber)}
                          className="h-4 w-4 rounded border-slate-300 text-blue-600"
                        />
                      ) : null}
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                          Part {part.partNumber}: {part.title}
                        </p>
                        <p className="text-xs text-slate-500">
                          {part.skill} · {part.questionCount} questions
                        </p>
                      </div>
                    </div>
                  </label>
                );
              })}
            </CardContent>
          </Card>

          {/* Comments Section */}
          <Card>
            <CardHeader className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-blue-600" aria-hidden="true" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Discussion &amp; Study Notes
              </h2>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={(e) => void handlePostComment(e)} className="flex gap-2">
                <input
                  type="text"
                  aria-label="Add exam discussion comment"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Share a strategy or question note..."
                  className="h-10 flex-1 rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
                />
                <Button
                  type="submit"
                  variant="outline"
                  size="sm"
                  isLoading={postCommentMutation.isPending}
                >
                  Post
                </Button>
              </form>

              {commentsQuery.data && commentsQuery.data.items.length > 0 ? (
                <div className="space-y-2">
                  {commentsQuery.data.items.map((c) => (
                    <div
                      key={c.id}
                      className="rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-800"
                    >
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        {c.authorDisplayName}
                      </p>
                      <p className="mt-0.5 text-slate-800 dark:text-slate-200">
                        {c.content}
                      </p>
                    </div>
                  ))}
                  <DataPagination
                    page={commentsQuery.data.pagination.page}
                    totalPages={commentsQuery.data.pagination.totalPages}
                    onPageChange={setCommentPage}
                  />
                </div>
              ) : (
                <p className="text-xs text-slate-500">
                  No comments yet. Be the first to share a study tip.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Mode & Launch Panel */}
        <div className="lg:col-span-4">
          <Card className="sticky top-20">
            <CardHeader>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Attempt Mode
              </h2>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    {
                      value: "TEST",
                      label: "Test Mode",
                      desc: "Timed countdown, score on submit",
                    },
                    {
                      value: "PRACTICE",
                      label: "Practice Mode",
                      desc: "Check answers & explanations live",
                    },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setMode(item.value)}
                    className={cn(
                      "rounded-xl border p-3 text-left transition-colors",
                      mode === item.value
                        ? "border-blue-600 bg-blue-50 dark:border-blue-500 dark:bg-blue-950/30"
                        : "border-slate-200 dark:border-slate-800"
                    )}
                  >
                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                      {item.label}
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{item.desc}</p>
                  </button>
                ))}
              </div>

              <div className="space-y-1 rounded-xl bg-slate-50 p-3 text-xs dark:bg-slate-950">
                <div className="flex justify-between">
                  <span className="text-slate-500">Selected Questions</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {selectedQuestionCount}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Estimated Duration</span>
                  <span className="inline-flex items-center gap-1 font-bold text-slate-900 dark:text-white">
                    <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                    {estimatedMinutes} min
                  </span>
                </div>
              </div>

              {isProLocked ? (
                <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
                  <Lock className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>Pro membership required for this test.</span>
                </div>
              ) : null}

              {startError ? (
                <p role="alert" className="text-xs font-medium text-red-600">
                  {startError}
                </p>
              ) : null}

              <Button
                type="button"
                variant="primary"
                size="lg"
                className="w-full"
                isLoading={startMutation.isPending}
                onClick={() => void handleStartExam()}
              >
                <Play className="h-4 w-4" aria-hidden="true" />
                Start {mode === "TEST" ? "Timed Test" : "Practice"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
