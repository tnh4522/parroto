"use client";

import Link from "next/link";
import { Award, CheckCircle2, XCircle } from "lucide-react";
import type { ExamTrack } from "@linguacraft/contracts";
import { useExamResultQuery } from "@/features/exams/api/exams-api";
import { cn } from "@/shared/lib/cn";
import { useAuthStore } from "@/shared/stores/auth-store";
import { Badge } from "@/shared/ui/Badge";
import { Button } from "@/shared/ui/Button";
import { Card, CardContent, CardHeader } from "@/shared/ui/Card";
import { EmptyState, ErrorState, LoadingState } from "@/shared/ui/StateBoundary";

function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export function ExamResultView({
  track,
  sessionId,
}: {
  track: ExamTrack;
  sessionId: string;
}) {
  const authStatus = useAuthStore((s) => s.status);
  const trackLower = track.toLowerCase();
  const resultQuery = useExamResultQuery(
    sessionId,
    authStatus === "authenticated"
  );

  if (authStatus === "loading" || resultQuery.isLoading) {
    return <LoadingState label="Grading and loading exam results..." />;
  }

  if (resultQuery.isError) {
    return (
      <ErrorState
        message={
          resultQuery.error instanceof Error
            ? resultQuery.error.message
            : "Failed to load exam result."
        }
        onRetry={() => void resultQuery.refetch()}
      />
    );
  }

  if (!resultQuery.data) {
    return <EmptyState title="Exam result not found" />;
  }

  const { session, groups, answersMap } = resultQuery.data;

  return (
    <div className="space-y-6">
      <Card className="border-blue-200 bg-blue-50/40 dark:border-blue-900/50 dark:bg-blue-950/20">
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6">
          <div className="space-y-1">
            <Badge variant="info">{session.track} · {session.mode}</Badge>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {session.examTitle}
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Completed attempt review and answer explanations.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 rounded-2xl bg-white px-5 py-3 shadow-sm dark:bg-slate-900">
              <Award className="h-7 w-7 text-blue-600" aria-hidden="true" />
              <div>
                <p className="text-xs font-medium text-slate-500">Score</p>
                <p className="text-xl font-extrabold text-slate-900 dark:text-white">
                  {session.scoreDisplay ?? "Graded"}
                  {typeof session.accuracyPct === "number"
                    ? ` (${Math.round(session.accuracyPct)}%)`
                    : ""}
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Link href="/analytics">
                <Button variant="primary" size="sm">
                  View Analytics
                </Button>
              </Link>
              <Link href={`/exams/${trackLower}`}>
                <Button variant="outline" size="sm">
                  More {track} Tests
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {groups.map((group) => (
          <Card key={group.id}>
            <CardHeader>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Part {group.partNumber} Review
              </h2>
            </CardHeader>
            <CardContent className="space-y-3">
              {group.questions.map((q) => {
                const ans = answersMap[String(q.questionNumber)];
                return (
                  <div
                    key={q.questionNumber}
                    className={cn(
                      "rounded-xl border p-4 text-sm",
                      ans?.isCorrect
                        ? "border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/50 dark:bg-emerald-950/20"
                        : "border-red-200 bg-red-50/40 dark:border-red-900/50 dark:bg-red-950/20"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-slate-900 dark:text-white">
                        Q{q.questionNumber}. {q.promptText}
                      </p>
                      {ans?.isCorrect ? (
                        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />
                      ) : (
                        <XCircle className="h-5 w-5 shrink-0 text-red-600" aria-hidden="true" />
                      )}
                    </div>
                    {ans ? (
                      <div className="mt-2 space-y-1 text-xs text-slate-700 dark:text-slate-300">
                        <p>
                          Your answer:{" "}
                          <strong>{ans.selectedValue || "(Unanswered)"}</strong> ·
                          Correct answer: <strong>{ans.correctAnswer}</strong>
                        </p>
                        {ans.explanationHtml ? (
                          <p className="text-slate-600 dark:text-slate-400">
                            {stripHtmlTags(ans.explanationHtml)}
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
