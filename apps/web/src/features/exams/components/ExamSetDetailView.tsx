"use client";

import Link from "next/link";
import { ArrowLeft, Clock, HelpCircle, Sparkles } from "lucide-react";
import type { ExamTrack } from "@linguacraft/contracts";
import { useExamSetDetailQuery } from "@/features/exams/api/exams-api";
import { Badge } from "@/shared/ui/Badge";
import { buttonVariants } from "@/shared/ui/Button";
import { Card, CardContent } from "@/shared/ui/Card";
import { EmptyState, ErrorState, LoadingState } from "@/shared/ui/StateBoundary";

export function ExamSetDetailView({
  track,
  setSlug,
}: {
  track: ExamTrack;
  setSlug: string;
}) {
  const trackLower = track.toLowerCase();
  const detailQuery = useExamSetDetailQuery(setSlug);

  if (detailQuery.isLoading) {
    return <LoadingState label="Loading exam tests..." />;
  }

  if (detailQuery.isError) {
    return (
      <ErrorState
        message={
          detailQuery.error instanceof Error
            ? detailQuery.error.message
            : "Could not load test set."
        }
        onRetry={() => void detailQuery.refetch()}
      />
    );
  }

  if (!detailQuery.data) {
    return <EmptyState title="Exam set not found" />;
  }

  const { examSet, exams } = detailQuery.data;

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <Link
          href={`/exams/${trackLower}`}
          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-blue-600 dark:text-slate-400"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Back to {track} Sets
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          {examSet.title}
        </h1>
        {examSet.description ? (
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {examSet.description}
          </p>
        ) : null}
      </div>

      {exams.length === 0 ? (
        <EmptyState title="No exams published inside this set yet" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {exams.map((exam) => (
            <Card key={exam.id} className="flex flex-col justify-between">
              <CardContent className="flex flex-1 flex-col justify-between gap-4 p-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
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
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    {exam.title}
                  </h2>
                  <div className="flex flex-wrap gap-3 text-xs text-slate-600 dark:text-slate-400">
                    <span className="inline-flex items-center gap-1">
                      <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
                      {exam.totalQuestions} questions
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                      {exam.durationMinutes} min
                    </span>
                  </div>
                </div>

                <Link
                  href={`/exams/${trackLower}/${encodeURIComponent(exam.slug)}`}
                  className={buttonVariants({ variant: "primary", size: "sm", className: "w-full" })}
                >
                  Configure &amp; Start
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
