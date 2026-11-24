"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Lock,
  Mic,
  MicOff,
  Play,
  Sparkles,
  Square,
  Volume2,
} from "lucide-react";
import type { LessonSentence } from "@linguacraft/contracts";
import {
  AudioCapturePipeline,
  isAudioCaptureSupported,
  transcribeRecordingFallback,
  type MicPermissionState,
  type RecordedClip,
} from "@/features/audio-engine/capture-pipeline";
import {
  createBrowserSpeechRecognizer,
  evaluateShadowingTranscript,
  type BrowserSpeechRecognitionLike,
  type ShadowingEvaluationResult,
} from "@/features/audio-engine/phoneme-aligner";
import { findCueIndexAtMs } from "@/features/audio-engine/segment-clock";
import {
  useLessonDetailQuery,
  useSubmitSentenceAttemptMutation,
} from "@/features/lessons/api/lessons-api";
import { MediaPlayerSurface } from "@/features/lessons/components/MediaPlayerSurface";
import { ApiClientError } from "@/shared/api/client";
import { cn } from "@/shared/lib/cn";
import { useAuthStore } from "@/shared/stores/auth-store";
import { useGlobalUiStore } from "@/shared/stores/ui-store";
import { Badge } from "@/shared/ui/Badge";
import { Button } from "@/shared/ui/Button";
import { Card, CardContent, CardHeader } from "@/shared/ui/Card";
import { EmptyState, ErrorState, LoadingState } from "@/shared/ui/StateBoundary";

type ShadowingMode = "LEARN" | "WATCH";

export function ShadowingWorkspace({ slug }: { slug: string }) {
  const user = useAuthStore((s) => s.user);
  const authStatus = useAuthStore((s) => s.status);
  const openLoginModal = useGlobalUiStore((s) => s.openLoginModal);
  const openDictionaryModal = useGlobalUiStore((s) => s.openDictionaryModal);

  const detailQuery = useLessonDetailQuery(slug);
  const lessonId = detailQuery.data?.lesson.id ?? "";
  const attemptMutation = useSubmitSentenceAttemptMutation(lessonId);

  const [mode, setMode] = useState<ShadowingMode>("LEARN");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [autoStop, setAutoStop] = useState(true);
  const [replayCount, setReplayCount] = useState(0);
  const [replaySignal, setReplaySignal] = useState(0);

  // Recording & Speech state
  const pipelineRef = useRef<AudioCapturePipeline | null>(null);
  const speechRef = useRef<BrowserSpeechRecognitionLike | null>(null);
  const playbackAudioRef = useRef<HTMLAudioElement>(null);

  const [micPermission, setMicPermission] = useState<MicPermissionState>("idle");
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [recordedClip, setRecordedClip] = useState<RecordedClip | null>(null);
  const [spokenTranscript, setSpokenTranscript] = useState("");
  const [evaluation, setEvaluation] = useState<ShadowingEvaluationResult | null>(null);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [attemptResult, setAttemptResult] = useState<{
    passed: boolean;
    sentenceScore: number;
    diamondsEarned: number;
  } | null>(null);

  useEffect(() => {
    const pipeline = new AudioCapturePipeline();
    pipelineRef.current = pipeline;
    return () => {
      pipeline.dispose();
      speechRef.current?.stop();
    };
  }, []);

  const sentences = useMemo<LessonSentence[]>(
    () => detailQuery.data?.sentences ?? [],
    [detailQuery.data?.sentences]
  );

  const activeSentence = sentences[currentIndex] ?? null;

  const resetPracticeForCue = useCallback(() => {
    setSpokenTranscript("");
    setEvaluation(null);
    setCaptureError(null);
    setAttemptResult(null);
    setReplayCount(0);
  }, []);

  const selectCue = useCallback(
    (index: number) => {
      if (index < 0 || index >= sentences.length) return;
      setCurrentIndex(index);
      resetPracticeForCue();
    },
    [sentences.length, resetPracticeForCue]
  );

  const handleTimeUpdateMs = useCallback(
    (ms: number) => {
      if (mode !== "WATCH" || sentences.length === 0) return;
      const idx = findCueIndexAtMs(sentences, ms);
      if (idx !== -1 && idx !== currentIndex) {
        setCurrentIndex(idx);
      }
    },
    [mode, sentences, currentIndex]
  );

  const scoreAndSubmit = useCallback(
    async (transcriptText: string) => {
      if (!activeSentence) return;
      setSpokenTranscript(transcriptText);
      const evalResult = evaluateShadowingTranscript(
        activeSentence.text,
        transcriptText,
        activeSentence.words
      );
      setEvaluation(evalResult);

      if (authStatus === "guest") {
        setAttemptResult({
          passed: evalResult.accuracyScore >= 75,
          sentenceScore: evalResult.accuracyScore,
          diamondsEarned: 0,
        });
        return;
      }

      try {
        const res = await attemptMutation.mutateAsync({
          sentenceId: activeSentence.id,
          mode: "SHADOWING",
          accuracyScore: evalResult.accuracyScore,
          mistakesCount: evalResult.mistakesCount,
          replayCount,
        });
        setAttemptResult({
          passed: res.passed,
          sentenceScore: res.sentenceScore,
          diamondsEarned: res.diamondsEarned,
        });
      } catch (err) {
        setCaptureError(
          err instanceof Error ? err.message : "Could not submit shadowing attempt."
        );
      }
    },
    [activeSentence, authStatus, attemptMutation, replayCount]
  );

  const handleStartRecording = async () => {
    setCaptureError(null);
    setAttemptResult(null);
    setEvaluation(null);
    setSpokenTranscript("");

    if (!isAudioCaptureSupported()) {
      setMicPermission("unsupported");
      setCaptureError("Microphone capture requires a modern browser with MediaRecorder.");
      return;
    }

    const pipeline = pipelineRef.current;
    if (!pipeline) return;

    setMicPermission("requesting");
    try {
      await pipeline.start();
      setMicPermission("granted");
      setIsRecording(true);

      const recognizer = createBrowserSpeechRecognizer();
      if (recognizer) {
        speechRef.current = recognizer;
        recognizer.onresult = (event) => {
          const firstAlt = event.results[0]?.[0];
          if (firstAlt?.transcript) {
            setSpokenTranscript(firstAlt.transcript);
          }
        };
        recognizer.onerror = () => {
          // Non-fatal: fallback transcription remains available after stopping
        };
        try {
          recognizer.start();
        } catch {
          // Ignore SpeechRecognition start errors if mic stream is exclusive
        }
      }
    } catch (err) {
      setIsRecording(false);
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        setMicPermission("denied");
        setCaptureError(
          "Microphone permission was denied. Enable microphone access in your browser settings to record."
        );
      } else {
        setMicPermission("idle");
        setCaptureError(
          err instanceof Error ? err.message : "Failed to start audio capture."
        );
      }
    }
  };

  const handleStopRecording = async () => {
    const pipeline = pipelineRef.current;
    if (!pipeline) return;

    setIsRecording(false);
    speechRef.current?.stop();
    speechRef.current = null;

    setIsAnalyzing(true);
    try {
      const clip = await pipeline.stop();
      setRecordedClip(clip);

      let transcriptToScore = spokenTranscript.trim();
      if (!transcriptToScore && authStatus === "authenticated") {
        try {
          transcriptToScore = await transcribeRecordingFallback(clip.blob, "en");
        } catch (fallbackErr) {
          setCaptureError(
            fallbackErr instanceof Error
              ? fallbackErr.message
              : "Speech recognition unavailable. Play back your recording or retry."
          );
        }
      }

      if (transcriptToScore) {
        await scoreAndSubmit(transcriptToScore);
      } else if (authStatus === "guest") {
        setCaptureError(
          "Your browser did not produce live SpeechRecognition text. Listen to your recorded audio or sign in for cloud speech scoring."
        );
      }
    } catch (err) {
      setCaptureError(
        err instanceof Error ? err.message : "Failed to finalize recording."
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handlePlayRecorded = () => {
    const audioEl = playbackAudioRef.current;
    if (!audioEl || !recordedClip) return;
    audioEl.currentTime = 0;
    void audioEl.play().catch(() => {
      setCaptureError("Unable to play back recorded audio clip.");
    });
  };

  if (detailQuery.isLoading) {
    return <LoadingState label="Loading shadowing lesson..." />;
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
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Pro or account access required
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300">{err.message}</p>
            <div className="flex gap-2">
              <Button
                variant="primary"
                onClick={() => openLoginModal("Sign in to unlock this lesson.")}
              >
                Sign in
              </Button>
              <Link href="/shadowing">
                <Button variant="outline">Back to lessons</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <ErrorState
        message={err instanceof Error ? err.message : "Failed to load shadowing lesson."}
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
          href="/shadowing"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-blue-600 dark:text-slate-400"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Shadowing Library
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
              Shadowing practice for this lesson is included with LinguaCraft Pro.
            </p>
            <div className="flex flex-wrap gap-2">
              {authStatus === "guest" ? (
                <Button
                  variant="primary"
                  onClick={() => openLoginModal("Sign in to access Pro shadowing.")}
                >
                  Sign in
                </Button>
              ) : null}
              <Link href="/shadowing">
                <Button variant="outline">Browse Free Lessons</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (sentences.length === 0 || !activeSentence) {
    return (
      <EmptyState
        title="No synchronized cues"
        description="This lesson has no timed sentences available for shadowing."
      />
    );
  }

  const translateLang = user?.preferredTranslateLang ?? "vi";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <Link
            href="/shadowing"
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-blue-600 dark:text-slate-400"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Shadowing Library
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              {lesson.title}
            </h1>
            <Badge variant="info">{lesson.cefrLevel}</Badge>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => {
                setMode("LEARN");
                setAutoStop(true);
              }}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
                mode === "LEARN"
                  ? "bg-white text-blue-600 shadow-sm dark:bg-slate-700 dark:text-blue-300"
                  : "text-slate-600 dark:text-slate-400"
              )}
            >
              Learn Mode
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("WATCH");
                setAutoStop(false);
              }}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
                mode === "WATCH"
                  ? "bg-white text-blue-600 shadow-sm dark:bg-slate-700 dark:text-blue-300"
                  : "text-slate-600 dark:text-slate-400"
              )}
            >
              Watch Mode
            </button>
          </div>

          <Link href={`/dictation/${encodeURIComponent(slug)}`}>
            <Button variant="outline" size="sm">
              Switch to Dictation
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-7">
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
            onReplaySegment={() => setReplayCount((c) => c + 1)}
            onTimeUpdateMs={handleTimeUpdateMs}
            replaySignal={replaySignal}
          />

          {/* Target Cue & Recording Studio */}
          <Card>
            <CardHeader className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-500">
                Sentence {currentIndex + 1} / {sentences.length}
              </span>
              <span className="text-xs text-slate-500">
                Mic status:{" "}
                <strong className="capitalize text-slate-700 dark:text-slate-200">
                  {micPermission}
                </strong>
              </span>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Interactive Target Sentence */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                <div className="flex flex-wrap gap-1.5 text-lg font-semibold leading-relaxed text-slate-900 dark:text-white">
                  {activeSentence.text.split(/\s+/).map((word, idx) => {
                    const clean = word.toLowerCase().replace(/[^a-z0-9']/g, "");
                    const wordResult = evaluation?.wordFeedback[idx];
                    return (
                      <button
                        key={`${activeSentence.id}-${idx}`}
                        type="button"
                        onClick={() => clean && openDictionaryModal(clean)}
                        className={cn(
                          "rounded px-1 transition-colors hover:bg-blue-100/70 dark:hover:bg-blue-900/40",
                          wordResult?.status === "matched" &&
                            "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300",
                          wordResult?.status === "mismatch" &&
                            "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300",
                          wordResult?.status === "missing" &&
                            "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                        )}
                      >
                        {word}
                      </button>
                    );
                  })}
                </div>
                {activeSentence.ipaText ? (
                  <p className="mt-2 font-mono text-xs text-slate-500 dark:text-slate-400">
                    {activeSentence.ipaText}
                  </p>
                ) : null}
                {activeSentence.translations?.[translateLang] ? (
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                    {activeSentence.translations[translateLang]}
                  </p>
                ) : null}
              </div>

              {/* Microphone Controls */}
              <div className="flex flex-wrap items-center gap-2">
                {!isRecording ? (
                  <Button
                    type="button"
                    variant="primary"
                    onClick={() => void handleStartRecording()}
                    isLoading={isAnalyzing}
                    disabled={micPermission === "requesting"}
                  >
                    <Mic className="h-4 w-4" aria-hidden="true" />
                    Record
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="danger"
                    onClick={() => void handleStopRecording()}
                  >
                    <Square className="h-4 w-4" aria-hidden="true" />
                    Stop Recording
                  </Button>
                )}

                {recordedClip ? (
                  <>
                    <audio
                      ref={playbackAudioRef}
                      src={recordedClip.objectUrl}
                      preload="metadata"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handlePlayRecorded}
                    >
                      <Volume2 className="h-4 w-4" aria-hidden="true" />
                      Play recorded audio
                    </Button>
                  </>
                ) : null}

                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setReplaySignal((s) => s + 1)}
                >
                  <Play className="h-4 w-4" aria-hidden="true" />
                  Listen Model
                </Button>
              </div>

              {captureError ? (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200"
                >
                  <MicOff className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{captureError}</span>
                </div>
              ) : null}

              {/* Word & Pronunciation Feedback */}
              {evaluation ? (
                <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Pronunciation Alignment
                      </p>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                        Accuracy: {evaluation.accuracyScore}%
                        {attemptResult?.diamondsEarned
                          ? ` · +${attemptResult.diamondsEarned} Diamonds`
                          : ""}
                      </p>
                    </div>
                    <Badge
                      variant={
                        evaluation.accuracyScore >= 75 ? "success" : "warning"
                      }
                    >
                      {evaluation.accuracyScore >= 75 ? "Clear" : "Retry recommended"}
                    </Badge>
                  </div>

                  {spokenTranscript ? (
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Recognized: &ldquo;{spokenTranscript}&rdquo;
                    </p>
                  ) : null}

                  <div className="flex flex-wrap gap-1.5">
                    {evaluation.wordFeedback.map((wf, idx) => (
                      <div
                        key={`${activeSentence.id}-fb-${idx}`}
                        className={cn(
                          "rounded-lg border px-2 py-1 text-xs",
                          wf.status === "matched"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
                            : "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
                        )}
                      >
                        <span className="font-semibold">{wf.expectedWord}</span>
                        {wf.ipa ? (
                          <span className="ml-1 font-mono opacity-80">{wf.ipa}</span>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Cue Step Navigation */}
              <div className="flex items-center justify-between pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={currentIndex === 0}
                  onClick={() => selectCue(currentIndex - 1)}
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={currentIndex >= sentences.length - 1}
                  onClick={() => selectCue(currentIndex + 1)}
                >
                  Next
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Synchronized Cue Script */}
        <div className="lg:col-span-5">
          <Card>
            <CardHeader>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Synchronized Script ({sentences.length} cues)
              </h2>
            </CardHeader>
            <CardContent className="max-h-[520px] space-y-2 overflow-y-auto">
              {sentences.map((cue, idx) => {
                const isActive = idx === currentIndex;
                return (
                  <button
                    key={cue.id}
                    type="button"
                    onClick={() => selectCue(idx)}
                    className={cn(
                      "w-full rounded-xl border p-3 text-left transition-colors",
                      isActive
                        ? "border-blue-500 bg-blue-50/70 dark:border-blue-500 dark:bg-blue-950/30"
                        : "border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60"
                    )}
                  >
                    <div className="mb-1 flex items-center justify-between text-[11px] font-semibold text-slate-500">
                      <span>Segment #{idx + 1}</span>
                      <span>
                        {Math.floor(cue.startMs / 1000)}s – {Math.floor(cue.endMs / 1000)}s
                      </span>
                    </div>
                    <p className="text-xs font-medium text-slate-900 dark:text-slate-100">
                      {cue.text}
                    </p>
                  </button>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
