"use client";

import Link from "next/link";
import { ArrowRight, BarChart2, BookCheck, FileText } from "lucide-react";
import type { ExamTrack } from "@linguacraft/contracts";
import { useExamSetsQuery } from "@/features/exams/api/exams-api";
import { cn } from "@/shared/lib/cn";
import { Badge } from "@/shared/ui/Badge";
import { Button } from "@/shared/ui/Button";
import { Card, CardContent } from "@/shared/ui/Card";
import { EmptyState, ErrorState, LoadingState } from "@/shared/ui/StateBoundary";

export function ExamTrackLandingView({ track }: { track: ExamTrack }) {
  const trackLower = track.toLowerCase();
  const setsQuery = useExamSetsQuery(track);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {track} Practice Library
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {track === "IELTS"
              ? "Academic Listening and Reading test sets with timed simulations and section diagnostics."
              : "Part-customizable Listening and Reading TOEIC sets (200 questions / 120 minutes)."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
            <Link
              href="/exams/ielts"
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-bold",
                track === "IELTS"
                  ? "bg-white text-blue-600 shadow-sm dark:bg-slate-700 dark:text-blue-300"
                  : "text-slate-600 dark:text-slate-400"
              )}
            >
              IELTS
            </Link>
            <Link
              href="/exams/toeic"
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-bold",
                track === "TOEIC"
                  ? "bg-white text-blue-600 shadow-sm dark:bg-slate-700 dark:text-blue-300"
                  : "text-slate-600 dark:text-slate-400"
              )}
            >
              TOEIC
            </Link>
          </div>
          <Link href="/analytics">
            <Button variant="outline" size="sm">
              <BarChart2 className="h-4 w-4" aria-hidden="true" />
              Analytics
            </Button>
          </Link>
        </div>
      </div>

      {setsQuery.isLoading ? (
        <LoadingState label={`Loading ${track} exam sets...`} />
      ) : setsQuery.isError ? (
        <ErrorState
          message={
            setsQuery.error instanceof Error
              ? setsQuery.error.message
              : "Could not load exam sets."
          }
          onRetry={() => void setsQuery.refetch()}
        />
      ) : !setsQuery.data || setsQuery.data.sets.length === 0 ? (
        <EmptyState
          title={`No ${track} sets available`}
          description="Check back soon for new curated practice collections."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {setsQuery.data.sets.map((examSet) => (
            <Card
              key={examSet.id}
              className="flex flex-col justify-between transition-colors hover:border-blue-400/70"
            >
              <CardContent className="flex flex-1 flex-col justify-between gap-4 p-5">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="info">{examSet.track}</Badge>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500">
                      <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                      {examSet.examCount} tests
                    </span>
                  </div>

                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    {examSet.title}
                  </h2>
                  {examSet.description ? (
                    <p className="line-clamp-2 text-xs text-slate-600 dark:text-slate-400">
                      {examSet.description}
                    </p>
                  ) : null}
                </div>

                <Link href={`/exams/${trackLower}/sets/${encodeURIComponent(examSet.slug)}`}>
                  <Button variant="primary" size="sm" className="w-full">
                    <BookCheck className="h-4 w-4" aria-hidden="true" />
                    Open Test Set
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
