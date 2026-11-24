"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock,
  Flag,
  Lock,
  Save,
  Send,
  XCircle,
} from "lucide-react";
import type { CheckExamQuestionResponse, ExamTrack } from "@linguacraft/contracts";
import {
  useAbandonExamSessionMutation,
  useCheckPracticeQuestionMutation,
  useSaveExamAnswersMutation,
  useSessionQuestionsQuery,
  useSubmitExamSessionMutation,
} from "@/features/exams/api/exams-api";
import { cn } from "@/shared/lib/cn";
import { useAuthStore } from "@/shared/stores/auth-store";
import { useGlobalUiStore } from "@/shared/stores/ui-store";
import { Badge } from "@/shared/ui/Badge";
import { Button } from "@/shared/ui/Button";
import { Card, CardContent, CardHeader } from "@/shared/ui/Card";
import { EmptyState, ErrorState, LoadingState } from "@/shared/ui/StateBoundary";

interface LocalAnswerEntry {
  selectedValue: string;
  isFlagged: boolean;
}

function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function formatCountdown(seconds: number): string {
  const safe = Math.max(0, seconds);
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export function ExamSessionRunnerView({
  track,
  sessionId,
}: {
  track: ExamTrack;
  sessionId: string;
}) {
  const router = useRouter();
  const authStatus = useAuthStore((s) => s.status);
  const openLoginModal = useGlobalUiStore((s) => s.openLoginModal);

  const trackLower = track.toLowerCase();
  const isAuthed = authStatus === "authenticated";

  const questionsQuery = useSessionQuestionsQuery(sessionId, undefined, isAuthed);
  const saveMutation = useSaveExamAnswersMutation(sessionId);
  const checkMutation = useCheckPracticeQuestionMutation(sessionId);
  const submitMutation = useSubmitExamSessionMutation(sessionId);
  const abandonMutation = useAbandonExamSessionMutation(sessionId);

  const [activePart, setActivePart] = useState<number | null>(null);
  const [answersMap, setAnswersMap] = useState<Record<number, LocalAnswerEntry>>(
    {}
  );
  const [answersHydrated, setAnswersHydrated] = useState(false);
  const [checkResults, setCheckResults] = useState<
    Record<number, CheckExamQuestionResponse>
  >({});
  const [remainingSec, setRemainingSec] = useState<number | null>(null);
  const [saveBanner, setSaveBanner] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Hydrate answers & countdown once fetched
  useEffect(() => {
    const data = questionsQuery.data;
    if (!data || answersHydrated) return;

    const initial: Record<number, LocalAnswerEntry> = {};
    for (const [key, val] of Object.entries(data.savedAnswers)) {
      const qn = Number(key);
      if (Number.isFinite(qn)) {
        initial[qn] = {
          selectedValue: val.selectedValue,
          isFlagged: val.isFlagged,
        };
      }
    }
    setAnswersMap(initial);
    setAnswersHydrated(true);

    if (activePart === null && data.parts[0]) {
      setActivePart(data.parts[0].partNumber);
    }

    if (data.session.mode === "TEST" && data.session.expiresAt) {
      const diffSec = Math.max(
        0,
        Math.floor((Date.parse(data.session.expiresAt) - Date.now()) / 1000)
      );
      setRemainingSec(diffSec);
    }
  }, [questionsQuery.data, answersHydrated, activePart]);

  const handleSubmitExam = useCallback(async () => {
    setActionError(null);
    try {
      const payload = Object.entries(answersMap).map(([qn, entry]) => ({
        questionNumber: Number(qn),
        selectedValue: entry.selectedValue,
        isFlagged: entry.isFlagged,
      }));
      if (payload.length > 0) {
        await saveMutation.mutateAsync(payload);
      }
      await submitMutation.mutateAsync();
      router.push(`/exams/${trackLower}/result/${encodeURIComponent(sessionId)}`);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Could not submit exam session."
      );
    }
  }, [answersMap, saveMutation, submitMutation, router, trackLower, sessionId]);

  // Countdown tick for TEST mode
  useEffect(() => {
    if (remainingSec === null || remainingSec <= 0) return;
    const timer = window.setInterval(() => {
      setRemainingSec((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          window.clearInterval(timer);
          void handleSubmitExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [remainingSec, handleSubmitExam]);

  const visibleGroups = useMemo(() => {
    const groups = questionsQuery.data?.groups ?? [];
    if (activePart === null) return groups;
    const filtered = groups.filter((g) => g.partNumber === activePart);
    return filtered.length > 0 ? filtered : groups;
  }, [questionsQuery.data?.groups, activePart]);

  const allQuestions = useMemo(
    () =>
      (questionsQuery.data?.groups ?? []).flatMap((g) => g.questions),
    [questionsQuery.data?.groups]
  );

  const setQuestionAnswer = (questionNumber: number, selectedValue: string) => {
    setAnswersMap((prev) => ({
      ...prev,
      [questionNumber]: {
        selectedValue,
        isFlagged: prev[questionNumber]?.isFlagged ?? false,
      },
    }));
  };

  const toggleFlag = (questionNumber: number) => {
    setAnswersMap((prev) => ({
      ...prev,
      [questionNumber]: {
        selectedValue: prev[questionNumber]?.selectedValue ?? "",
        isFlagged: !(prev[questionNumber]?.isFlagged ?? false),
      },
    }));
  };

  const handleSaveProgress = async () => {
    setActionError(null);
    const payload = Object.entries(answersMap).map(([qn, entry]) => ({
      questionNumber: Number(qn),
      selectedValue: entry.selectedValue,
      isFlagged: entry.isFlagged,
    }));
    try {
      const res = await saveMutation.mutateAsync(payload);
      setSaveBanner(`Saved ${res.savedCount} answer${res.savedCount === 1 ? "" : "s"}.`);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Failed to save progress."
      );
    }
  };

  const handleCheckQuestion = async (questionNumber: number) => {
    setActionError(null);
    try {
      const entry = answersMap[questionNumber];
      if (entry?.selectedValue) {
        await saveMutation.mutateAsync([
          {
            questionNumber,
            selectedValue: entry.selectedValue,
            isFlagged: entry.isFlagged,
          },
        ]);
      }
      const checked = await checkMutation.mutateAsync(questionNumber);
      setCheckResults((prev) => ({ ...prev, [questionNumber]: checked }));
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Could not verify question answer."
      );
    }
  };

  const handleAbandon = async () => {
    try {
      await abandonMutation.mutateAsync();
      router.push(`/exams/${trackLower}`);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Failed to abandon session."
      );
    }
  };

  if (authStatus === "loading") {
    return <LoadingState label="Checking session..." />;
  }

  if (!isAuthed) {
    return (
      <Card className="mx-auto max-w-xl">
        <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
          <Lock className="h-10 w-10 text-blue-600" aria-hidden="true" />
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">
            Sign in required for exam session
          </h1>
          <Button
            variant="primary"
            onClick={() => openLoginModal("Sign in to resume your exam session.")}
          >
            Sign in
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (questionsQuery.isLoading) {
    return <LoadingState label="Preparing exam paper..." />;
  }

  if (questionsQuery.isError) {
    return (
      <ErrorState
        message={
          questionsQuery.error instanceof Error
            ? questionsQuery.error.message
            : "Failed to load exam questions."
        }
        onRetry={() => void questionsQuery.refetch()}
      />
    );
  }

  if (!questionsQuery.data || allQuestions.length === 0) {
    return (
      <EmptyState
        title="No questions in this exam session"
        action={
          <Link href={`/exams/${trackLower}`}>
            <Button variant="outline">Back to {track}</Button>
          </Link>
        }
      />
    );
  }

  const { session, parts } = questionsQuery.data;

  return (
    <div className="space-y-5">
      {/* Top Runner Bar */}
      <div className="sticky top-16 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="info">{session.track}</Badge>
          <Badge variant={session.mode === "TEST" ? "warning" : "success"}>
            {session.mode}
          </Badge>
          {remainingSec !== null ? (
            <span
              aria-label="Time remaining"
              className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-xs font-bold text-slate-800 dark:bg-slate-800 dark:text-slate-100"
            >
              <Clock className="h-3.5 w-3.5 text-blue-600" aria-hidden="true" />
              {formatCountdown(remainingSec)}
            </span>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            isLoading={saveMutation.isPending}
            onClick={() => void handleSaveProgress()}
          >
            <Save className="h-4 w-4" aria-hidden="true" />
            Save Progress
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            isLoading={abandonMutation.isPending}
            onClick={() => void handleAbandon()}
          >
            Abandon
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            isLoading={submitMutation.isPending}
            onClick={() => void handleSubmitExam()}
          >
            <Send className="h-4 w-4" aria-hidden="true" />
            Submit Test
          </Button>
        </div>
      </div>

      {saveBanner ? (
        <p role="status" className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
          {saveBanner}
        </p>
      ) : null}
      {actionError ? (
        <p role="alert" className="text-xs font-semibold text-red-600">
          {actionError}
        </p>
      ) : null}

      {/* Part Switcher */}
      <div className="flex flex-wrap gap-1.5">
        {parts.map((part) => (
          <button
            key={part.partNumber}
            type="button"
            onClick={() => setActivePart(part.partNumber)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
              activePart === part.partNumber
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
            )}
          >
            Part {part.partNumber}: {part.title}
          </button>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-12">
        {/* Question Groups Column */}
        <div className="space-y-5 lg:col-span-9">
          {visibleGroups.map((group) => (
            <Card key={group.id}>
              <CardHeader className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold uppercase tracking-wide text-blue-600">
                    Part {group.partNumber}
                  </span>
                </div>
                {group.instruction ? (
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                    {group.instruction}
                  </p>
                ) : null}
                {group.audioSignedUrl ? (
                  <audio
                    controls
                    src={group.audioSignedUrl}
                    className="w-full pt-1"
                    aria-label={`Listening audio for part ${group.partNumber}`}
                  />
                ) : null}
              </CardHeader>

              <CardContent className="space-y-5">
                {group.passageText ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
                    {group.passageText}
                  </div>
                ) : null}

                <div className="space-y-4">
                  {group.questions.map((q) => {
                    const entry = answersMap[q.questionNumber];
                    const checkResult = checkResults[q.questionNumber];

                    return (
                      <div
                        key={q.questionNumber}
                        id={`question-${q.questionNumber}`}
                        className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-800"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">
                            <span className="mr-1.5 text-blue-600">
                              Q{q.questionNumber}.
                            </span>
                            {q.promptText}
                          </p>
                          <div className="flex shrink-0 items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              aria-label={`Flag question ${q.questionNumber}`}
                              onClick={() => toggleFlag(q.questionNumber)}
                            >
                              <Flag
                                className={cn(
                                  "h-4 w-4",
                                  entry?.isFlagged
                                    ? "fill-amber-500 text-amber-500"
                                    : "text-slate-400"
                                )}
                                aria-hidden="true"
                              />
                            </Button>
                            {session.mode === "PRACTICE" ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => void handleCheckQuestion(q.questionNumber)}
                              >
                                Check Answer
                              </Button>
                            ) : null}
                          </div>
                        </div>

                        {q.questionType === "FILL_BLANK" || q.options.length === 0 ? (
                          <input
                            type="text"
                            aria-label={`Answer for question ${q.questionNumber}`}
                            value={entry?.selectedValue ?? ""}
                            onChange={(e) =>
                              setQuestionAnswer(q.questionNumber, e.target.value)
                            }
                            placeholder="Type your answer..."
                            className="h-10 w-full max-w-md rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
                          />
                        ) : (
                          <div className="grid gap-2 sm:grid-cols-2">
                            {q.options.map((opt) => {
                              const selected = entry?.selectedValue === opt.value;
                              return (
                                <label
                                  key={opt.value}
                                  className={cn(
                                    "flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2 text-sm transition-colors",
                                    selected
                                      ? "border-blue-600 bg-blue-50 text-blue-950 dark:border-blue-500 dark:bg-blue-950/30 dark:text-blue-100"
                                      : "border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
                                  )}
                                >
                                  <input
                                    type="radio"
                                    name={`question-${q.questionNumber}`}
                                    value={opt.value}
                                    checked={selected}
                                    onChange={() =>
                                      setQuestionAnswer(q.questionNumber, opt.value)
                                    }
                                    className="text-blue-600"
                                  />
                                  <span>{opt.label}</span>
                                </label>
                              );
                            })}
                          </div>
                        )}

                        {checkResult ? (
                          <div
                            role="status"
                            className={cn(
                              "rounded-xl border p-3 text-xs",
                              checkResult.isCorrect
                                ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200"
                                : "border-red-200 bg-red-50 text-red-900 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200"
                            )}
                          >
                            <p className="inline-flex items-center gap-1.5 font-bold">
                              {checkResult.isCorrect ? (
                                <>
                                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                                  Correct! ({checkResult.correctAnswer})
                                </>
                              ) : (
                                <>
                                  <XCircle className="h-4 w-4" aria-hidden="true" />
                                  Correct answer: {checkResult.correctAnswer}
                                </>
                              )}
                            </p>
                            {checkResult.explanationHtml ? (
                              <p className="mt-1">
                                {stripHtmlTags(checkResult.explanationHtml)}
                              </p>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Question Palette Sidebar */}
        <div className="lg:col-span-3">
          <Card className="sticky top-36">
            <CardHeader>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Question Navigator
              </h2>
            </CardHeader>
            <CardContent className="grid grid-cols-5 gap-1.5">
              {allQuestions.map((q) => {
                const entry = answersMap[q.questionNumber];
                const hasAnswer = Boolean(entry?.selectedValue.trim());
                return (
                  <a
                    key={q.questionNumber}
                    href={`#question-${q.questionNumber}`}
                    onClick={() => setActivePart(q.partNumber)}
                    className={cn(
                      "relative flex h-9 items-center justify-center rounded-lg border text-xs font-bold transition-colors",
                      hasAnswer
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                    )}
                  >
                    {q.questionNumber}
                    {entry?.isFlagged ? (
                      <span
                        className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-amber-500"
                        aria-label="Flagged"
                      />
                    ) : null}
                  </a>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
