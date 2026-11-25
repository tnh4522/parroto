"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  HelpCircle,
  Lock,
  Sparkles,
} from "lucide-react";
import type { LessonSentence } from "@linguacraft/contracts";
import { MediaPlayerSurface } from "@/features/lessons/components/MediaPlayerSurface";
import {
  useLessonDetailQuery,
  useSubmitSentenceAttemptMutation,
} from "@/features/lessons/api/lessons-api";
import {
  evaluateDictationInput,
  maskDictationToken,
  tokenizeSentence,
  type DictationDifficulty,
} from "@/features/dictation/lib/dictation-engine";
import { ApiClientError } from "@/shared/api/client";
import { cn } from "@/shared/lib/cn";
import { useAuthStore } from "@/shared/stores/auth-store";
import { useGlobalUiStore } from "@/shared/stores/ui-store";
import { Badge } from "@/shared/ui/Badge";
import { Button, buttonVariants } from "@/shared/ui/Button";
import { Card, CardContent, CardHeader } from "@/shared/ui/Card";
import { EmptyState, ErrorState, LoadingState } from "@/shared/ui/StateBoundary";

const DIFFICULTY_OPTIONS: { value: DictationDifficulty; label: string }[] = [
  { value: "EASY", label: "Easy" },
  { value: "NORMAL", label: "Normal" },
  { value: "HARD", label: "Hard" },
];

export function DictationWorkspace({ slug }: { slug: string }) {
  const user = useAuthStore((s) => s.user);
  const authStatus = useAuthStore((s) => s.status);
  const openLoginModal = useGlobalUiStore((s) => s.openLoginModal);
  const openDictionaryModal = useGlobalUiStore((s) => s.openDictionaryModal);
  const isDictionaryOpen = useGlobalUiStore((s) => s.isDictionaryModalOpen);
  const isLoginOpen = useGlobalUiStore((s) => s.isLoginModalOpen);

  const detailQuery = useLessonDetailQuery(slug);
  const lessonId = detailQuery.data?.lesson.id ?? "";
  const attemptMutation = useSubmitSentenceAttemptMutation(lessonId);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [difficulty, setDifficulty] = useState<DictationDifficulty>("NORMAL");
  const [typedInput, setTypedInput] = useState("");
  const [revealedIndices, setRevealedIndices] = useState<Set<number>>(() => new Set());
  const [hintPenaltyCount, setHintPenaltyCount] = useState(0);
  const [replayCount, setReplayCount] = useState(0);
  const [replaySignal, setReplaySignal] = useState(0);
  const [togglePlaySignal, setTogglePlaySignal] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [autoStop, setAutoStop] = useState(true);
  const [showFullAnswer, setShowFullAnswer] = useState(false);
  const [showTranscriptDrawer, setShowTranscriptDrawer] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);
  const [submissionFeedback, setSubmissionFeedback] = useState<{
    passed: boolean;
    sentenceScore: number;
    diamondsEarned: number;
  } | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const sentences = useMemo<LessonSentence[]>(
    () => detailQuery.data?.sentences ?? [],
    [detailQuery.data?.sentences]
  );

  const activeSentence = sentences[currentIndex] ?? null;
  const activeTokens = useMemo(
    () => (activeSentence ? tokenizeSentence(activeSentence.text) : []),
    [activeSentence]
  );

  const evaluation = useMemo(() => {
    if (!activeSentence) return null;
    return evaluateDictationInput(
      activeSentence.text,
      typedInput,
      revealedIndices,
      hintPenaltyCount
    );
  }, [activeSentence, typedInput, revealedIndices, hintPenaltyCount]);

  const resetSentenceState = useCallback(() => {
    setTypedInput("");
    setRevealedIndices(new Set());
    setHintPenaltyCount(0);
    setReplayCount(0);
    setShowFullAnswer(false);
    setSubmissionFeedback(null);
    setSubmitError(null);
  }, []);

  const goToSentence = useCallback(
    (nextIndex: number) => {
      if (nextIndex < 0 || nextIndex >= sentences.length) return;
      setCurrentIndex(nextIndex);
      resetSentenceState();
    },
    [sentences.length, resetSentenceState]
  );

  const handleRevealNextWord = () => {
    if (!evaluation) return;
    const nextUnmatchedIndex = evaluation.statuses.findIndex(
      (status) => status === "pending" || status === "mismatch"
    );
    if (nextUnmatchedIndex === -1) return;
    setRevealedIndices((prev) => {
      const next = new Set(prev);
      next.add(nextUnmatchedIndex);
      return next;
    });
    setHintPenaltyCount((c) => c + 1);
  };

  const handleCheckAndSubmit = async () => {
    if (!activeSentence || !evaluation) return;
    setSubmitError(null);

    if (authStatus === "guest") {
      setSubmissionFeedback({
        passed: evaluation.accuracyScore >= 80,
        sentenceScore: evaluation.accuracyScore,
        diamondsEarned: 0,
      });
      setCompletedCount((c) => c + 1);
      return;
    }

    try {
      const result = await attemptMutation.mutateAsync({
        sentenceId: activeSentence.id,
        mode: "DICTATION",
        accuracyScore: evaluation.accuracyScore,
        mistakesCount: evaluation.mistakesCount,
        replayCount,
      });
      setSubmissionFeedback({
        passed: result.passed,
        sentenceScore: result.sentenceScore,
        diamondsEarned: result.diamondsEarned,
      });
      if (result.passed) {
        setCompletedCount((c) => c + 1);
      }
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Could not record attempt."
      );
    }
  };

  const handleReplay = useCallback(() => {
    setReplayCount((c) => c + 1);
    setReplaySignal((s) => s + 1);
  }, []);

  // Non-trapping shortcuts while practicing dictation (skip when a modal is open)
  useEffect(() => {
    if (isDictionaryOpen || isLoginOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.altKey && event.key.toLowerCase() === "r") {
        event.preventDefault();
        handleReplay();
      } else if (event.altKey && event.key.toLowerCase() === "p") {
        event.preventDefault();
        setTogglePlaySignal((s) => s + 1);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleReplay, isDictionaryOpen, isLoginOpen]);

  if (detailQuery.isLoading) {
    return <LoadingState label="Loading dictation lesson..." />;
  }

  if (detailQuery.isError) {
    const err = detailQuery.error;
    const isAccessDenied =
      err instanceof ApiClientError &&
      (err.statusCode === 401 || err.statusCode === 403);
    if (isAccessDenied) {
      return (
        <Card className="mx-auto max-w-xl border-amber-200 bg-amber-50/40 dark:border-amber-900/50 dark:bg-amber-950/20">
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <Lock className="h-10 w-10 text-amber-600" aria-hidden="true" />
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Pro or account access required
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {err.message}
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <Button
                type="button"
                variant="primary"
                onClick={() => openLoginModal("Sign in to unlock this lesson.")}
              >
                Sign in
              </Button>
              <Link
                href="/dictation"
                className={buttonVariants({ variant: "outline" })}
              >
                Back to lessons
              </Link>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <ErrorState
        message={err instanceof Error ? err.message : "Failed to load lesson."}
        onRetry={() => void detailQuery.refetch()}
      />
    );
  }

  if (!detailQuery.data) {
    return <EmptyState title="Lesson not found" />;
  }

  const { lesson, signedMediaUrl } = detailQuery.data;
  const isProLocked =
    lesson.isPro && (!detailQuery.data.sentences || detailQuery.data.sentences.length === 0);

  if (isProLocked) {
    return (
      <div className="space-y-4">
        <Link
          href="/dictation"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-blue-600 dark:text-slate-400"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Dictation Library
        </Link>

        <Card className="border-amber-200 bg-amber-50/40 dark:border-amber-900/50 dark:bg-amber-950/20">
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <Badge variant="pro">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              PRO Lesson
            </Badge>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              {lesson.title}
            </h1>
            <p className="max-w-md text-sm text-slate-600 dark:text-slate-300">
              Full interactive transcript and dictation sentences for this lesson are
              available on LinguaCraft Pro.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {authStatus === "guest" ? (
                <Button
                  type="button"
                  variant="primary"
                  onClick={() =>
                    openLoginModal("Sign in to access your Pro membership.")
                  }
                >
                  Sign in to check access
                </Button>
              ) : null}
              <Link
                href="/dictation"
                className={buttonVariants({ variant: "outline" })}
              >
                Browse Free Lessons
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (sentences.length === 0 || !activeSentence || !evaluation) {
    return (
      <EmptyState
        title="No transcript cues yet"
        description="This lesson does not have synchronized dictation sentences yet."
        action={
          <Link href="/dictation" className={buttonVariants({ variant: "outline" })}>
            Back to lessons
          </Link>
        }
      />
    );
  }

  const translateLang = user?.preferredTranslateLang ?? "vi";

  return (
    <div className="space-y-5">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <Link
            href="/dictation"
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-blue-600 dark:text-slate-400"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Dictation Library
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              {lesson.title}
            </h1>
            <Badge variant="info">{lesson.cefrLevel}</Badge>
            {lesson.isPro ? <Badge variant="pro">PRO</Badge> : <Badge variant="success">Free</Badge>}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            Sentence {currentIndex + 1} / {sentences.length}
          </span>
          <Link
            href={`/shadowing/${encodeURIComponent(slug)}`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Switch to Shadowing
          </Link>
        </div>
      </div>

      {/* Guest Nudge Banner */}
      {authStatus === "guest" && completedCount >= 3 ? (
        <div
          role="region"
          aria-label="Sign in prompt"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm dark:border-blue-900/60 dark:bg-blue-950/30"
        >
          <p className="text-slate-800 dark:text-slate-200">
            You completed {completedCount} sentences in guest mode. Sign in to save XP,
            streaks, and accuracy history.
          </p>
          <Button
            type="button"
            size="sm"
            variant="primary"
            onClick={() => openLoginModal("Save your dictation progress and XP.")}
          >
            Sign in
          </Button>
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-12">
        {/* Main Practice Column */}
        <div className="space-y-4 lg:col-span-8">
          <MediaPlayerSurface
            title={lesson.title}
            mediaType={lesson.mediaType}
            signedMediaUrl={signedMediaUrl}
            youtubeVideoId={lesson.youtubeVideoId}
            activeCue={activeSentence}
            playbackRate={playbackRate}
            onPlaybackRateChange={setPlaybackRate}
            autoStop={autoStop}
            onAutoStopChange={setAutoStop}
            replaySignal={replaySignal}
            togglePlaySignal={togglePlaySignal}
          />

          <Card>
            <CardHeader className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Difficulty
                </span>
                <div className="inline-flex rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800">
                  {DIFFICULTY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setDifficulty(opt.value)}
                      className={cn(
                        "rounded-md px-2.5 py-1 text-xs font-semibold transition-colors",
                        difficulty === opt.value
                          ? "bg-white text-blue-600 shadow-sm dark:bg-slate-700 dark:text-blue-300"
                          : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRevealNextWord}
                >
                  <HelpCircle className="h-4 w-4" aria-hidden="true" />
                  Reveal Word
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFullAnswer((v) => !v)}
                >
                  {showFullAnswer ? (
                    <>
                      <EyeOff className="h-4 w-4" aria-hidden="true" />
                      Hide Answer
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4" aria-hidden="true" />
                      Show Answer
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Tokenized Mask / Word Reveal View */}
              <div
                aria-label="Sentence word slots"
                className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950"
              >
                {activeTokens.map((token, idx) => {
                  const status = evaluation.statuses[idx] ?? "pending";
                  const isVisible =
                    showFullAnswer || status === "matched" || status === "revealed";
                  return isVisible ? (
                    <button
                      key={`${activeSentence.id}-${idx}`}
                      type="button"
                      onClick={() =>
                        token.normalized && openDictionaryModal(token.normalized)
                      }
                      title="Look up word in dictionary"
                      className={cn(
                        "rounded-md border px-2 py-1 text-sm font-medium transition-colors",
                        status === "matched"
                          ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                          : "border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300"
                      )}
                    >
                      {token.raw}
                    </button>
                  ) : (
                    <span
                      key={`${activeSentence.id}-${idx}`}
                      className={cn(
                        "rounded-md border px-2 py-1 font-mono text-sm",
                        status === "mismatch"
                          ? "border-red-300 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
                          : "border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400"
                      )}
                    >
                      {maskDictationToken(token, difficulty)}
                    </span>
                  );
                })}
              </div>

              {showFullAnswer && activeSentence.ipaText ? (
                <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                  IPA: {activeSentence.ipaText}
                </p>
              ) : null}

              {/* Typing Area */}
              <div className="space-y-1.5">
                <label
                  htmlFor="dictation-input"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  Type what you hear
                </label>
                <textarea
                  id="dictation-input"
                  rows={3}
                  value={typedInput}
                  onChange={(e) => setTypedInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void handleCheckAndSubmit();
                    }
                  }}
                  placeholder="Listen carefully and transcribe this sentence... (Alt+R: replay, Enter: check)"
                  className="w-full rounded-xl border-2 border-slate-200 bg-white p-3 text-sm text-slate-900 placeholder:text-slate-500 focus-visible:border-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-400"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Shortcuts: <kbd className="rounded border px-1">Alt+R</kbd> Replay ·{" "}
                  <kbd className="rounded border px-1">Alt+P</kbd> Play/Pause ·{" "}
                  <kbd className="rounded border px-1">Enter</kbd> Check &amp; Submit ·
                  Click revealed words for dictionary
                </p>
              </div>

              {submitError ? (
                <p role="alert" className="text-sm font-medium text-red-600 dark:text-red-400">
                  {submitError}
                </p>
              ) : null}

              {submissionFeedback ? (
                <div
                  role="status"
                  className={cn(
                    "flex flex-wrap items-center justify-between gap-2 rounded-xl border px-4 py-2.5 text-sm",
                    submissionFeedback.passed
                      ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200"
                      : "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200"
                  )}
                >
                  <span className="inline-flex items-center gap-1.5 font-semibold">
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    Score: {submissionFeedback.sentenceScore}% (
                    {submissionFeedback.passed ? "Passed" : "Keep practicing"})
                  </span>
                  {submissionFeedback.diamondsEarned > 0 ? (
                    <span className="font-semibold">
                      +{submissionFeedback.diamondsEarned} Diamonds
                    </span>
                  ) : null}
                </div>
              ) : null}

              {/* Action Controls */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={currentIndex === 0}
                    onClick={() => goToSentence(currentIndex - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                    Previous
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={currentIndex >= sentences.length - 1}
                    onClick={() => goToSentence(currentIndex + 1)}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>

                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  isLoading={attemptMutation.isPending}
                  onClick={() => void handleCheckAndSubmit()}
                >
                  Check &amp; Submit
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Transcript & Translation Side Column */}
        <div className="lg:col-span-4">
          <Card>
            <CardHeader className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Transcript ({sentences.length})
              </h2>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowTranscriptDrawer((v) => !v)}
              >
                {showTranscriptDrawer ? "Hide" : "Show"}
              </Button>
            </CardHeader>
            <CardContent className="max-h-[460px] space-y-2 overflow-y-auto">
              {!showTranscriptDrawer ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Transcript is hidden to protect active listening focus. Click{" "}
                  <strong>Show</strong> to jump between sentences or inspect translations.
                </p>
              ) : (
                sentences.map((sentence, idx) => {
                  const isActive = idx === currentIndex;
                  const translation = sentence.translations?.[translateLang];
                  return (
                    <button
                      key={sentence.id}
                      type="button"
                      onClick={() => goToSentence(idx)}
                      className={cn(
                        "w-full rounded-xl border p-3 text-left transition-colors",
                        isActive
                          ? "border-blue-500 bg-blue-50/70 dark:border-blue-500 dark:bg-blue-950/30"
                          : "border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60"
                      )}
                    >
                      <div className="mb-1 flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                        <span>Cue #{idx + 1}</span>
                        <span>{Math.floor(sentence.startMs / 1000)}s</span>
                      </div>
                      <p className="text-xs font-medium text-slate-900 dark:text-slate-100">
                        {sentence.text}
                      </p>
                      {translation ? (
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {translation}
                        </p>
                      ) : null}
                    </button>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
