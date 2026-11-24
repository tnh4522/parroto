"use client";

import Link from "next/link";
import { useState } from "react";
import { Award, BarChart3, Clock, Flame, Lock, Target, TrendingUp } from "lucide-react";
import type { ExamTrack } from "@linguacraft/contracts";
import {
  useExamAnalyticsQuery,
  useExamHistoryQuery,
} from "@/features/analytics/api/analytics-api";
import { cn } from "@/shared/lib/cn";
import { useAuthStore } from "@/shared/stores/auth-store";
import { useGlobalUiStore } from "@/shared/stores/ui-store";
import { Badge } from "@/shared/ui/Badge";
import { Button } from "@/shared/ui/Button";
import { Card, CardContent, CardHeader } from "@/shared/ui/Card";
import { EmptyState, ErrorState, LoadingState } from "@/shared/ui/StateBoundary";

export function AnalyticsDashboardView() {
  const user = useAuthStore((s) => s.user);
  const authStatus = useAuthStore((s) => s.status);
  const openLoginModal = useGlobalUiStore((s) => s.openLoginModal);

  const [track, setTrack] = useState<ExamTrack>("IELTS");
  const isAuthed = authStatus === "authenticated";

  const analyticsQuery = useExamAnalyticsQuery(track, isAuthed);
  const historyQuery = useExamHistoryQuery(track, 1, isAuthed);

  if (authStatus === "loading") {
    return <LoadingState label="Checking your session..." />;
  }

  if (!isAuthed) {
    return (
      <Card className="mx-auto max-w-xl">
        <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
          <Lock className="h-10 w-10 text-blue-600" aria-hidden="true" />
          <div className="space-y-1">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              Sign in to view Progress Analytics
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Track your IELTS &amp; TOEIC score trends, weak-area tags, and daily study
              streaks across sessions.
            </p>
          </div>
          <Button
            variant="primary"
            onClick={() => openLoginModal("Sign in to view your learning analytics.")}
          >
            Sign in
          </Button>
        </CardContent>
      </Card>
    );
  }

  const maxTrendScore = track === "IELTS" ? 9 : 990;
  const stats = user?.stats;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Progress Analytics
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Performance insights, score progression, and weak-area diagnosis.
          </p>
        </div>

        <div className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
          {(["IELTS", "TOEIC"] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setTrack(item)}
              className={cn(
                "rounded-lg px-4 py-1.5 text-xs font-bold transition-colors",
                track === item
                  ? "bg-white text-blue-600 shadow-sm dark:bg-slate-700 dark:text-blue-300"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              )}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {/* Lifetime User KPI Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-xl bg-orange-50 p-2.5 text-orange-600 dark:bg-orange-950/40">
              <Flame className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Current Streak</p>
              <p className="text-lg font-bold text-slate-900 dark:text-white">
                {stats?.currentStreakDays ?? 0} days
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600 dark:bg-blue-950/40">
              <Award className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Level &amp; XP</p>
              <p className="text-lg font-bold text-slate-900 dark:text-white">
                Lv {stats?.level ?? 1} · {stats?.xpTotal ?? 0} XP
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600 dark:bg-emerald-950/40">
              <TrendingUp className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">{track} Average</p>
              <p className="text-lg font-bold text-slate-900 dark:text-white">
                {analyticsQuery.data ? analyticsQuery.data.summary.averageScore : "—"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-xl bg-violet-50 p-2.5 text-violet-600 dark:bg-violet-950/40">
              <Clock className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">{track} Best Score</p>
              <p className="text-lg font-bold text-slate-900 dark:text-white">
                {analyticsQuery.data ? analyticsQuery.data.summary.bestScore : "—"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {analyticsQuery.isLoading ? (
        <LoadingState label={`Loading ${track} analytics...`} />
      ) : analyticsQuery.isError ? (
        <ErrorState
          message={
            analyticsQuery.error instanceof Error
              ? analyticsQuery.error.message
              : "Failed to load exam analytics."
          }
          onRetry={() => void analyticsQuery.refetch()}
        />
      ) : !analyticsQuery.data || analyticsQuery.data.scoreTrend.length === 0 ? (
        <EmptyState
          title={`No completed ${track} sessions yet`}
          description={`Complete your first ${track} mock test or practice set to populate score trends and weak-area diagnostics.`}
          action={
            <Link href={track === "IELTS" ? "/exams/ielts" : "/exams/toeic"}>
              <Button variant="primary">Explore {track} Exams</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid gap-5 lg:grid-cols-12">
          {/* Score Trend Visualization */}
          <Card className="lg:col-span-7">
            <CardHeader className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-blue-600" aria-hidden="true" />
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  {track} Score Progression
                </h2>
              </div>
              <Badge variant="info">
                {analyticsQuery.data.summary.totalCompleted} completed
              </Badge>
            </CardHeader>
            <CardContent className="space-y-3">
              <div
                className="flex h-48 items-end gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950"
                role="img"
                aria-label={`${track} score trend bar chart`}
              >
                {analyticsQuery.data.scoreTrend.map((point) => {
                  const pct = Math.max(
                    6,
                    Math.min(100, Math.round((point.score / maxTrendScore) * 100))
                  );
                  return (
                    <div
                      key={point.sessionId}
                      className="flex flex-1 flex-col items-center justify-end gap-1.5"
                    >
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                        {point.score}
                      </span>
                      <div
                        className="w-full max-w-[44px] rounded-t-lg bg-blue-600 transition-all"
                        style={{ height: `${pct}%` }}
                        title={`${point.examTitle}: ${point.score}`}
                      />
                      <span className="line-clamp-1 text-center text-[10px] text-slate-500">
                        {point.examTitle}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Weak Areas Breakdown */}
          <Card className="lg:col-span-5">
            <CardHeader className="flex items-center gap-2">
              <Target className="h-4 w-4 text-amber-600" aria-hidden="true" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Top Weak Areas
              </h2>
            </CardHeader>
            <CardContent className="space-y-3">
              {analyticsQuery.data.topWeakAreas.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No weak-area tags flagged yet. Keep practicing!
                </p>
              ) : (
                analyticsQuery.data.topWeakAreas.map((area) => (
                  <div key={area.tag} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-800 dark:text-slate-200">
                        {area.tag} ({area.questionCount} Qs)
                      </span>
                      <span
                        className={cn(
                          area.accuracyPct < 60
                            ? "text-red-600 dark:text-red-400"
                            : "text-emerald-600 dark:text-emerald-400"
                        )}
                      >
                        {Math.round(area.accuracyPct)}%
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          area.accuracyPct < 60 ? "bg-amber-500" : "bg-emerald-500"
                        )}
                        style={{ width: `${Math.round(area.accuracyPct)}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Exam Attempts */}
      {historyQuery.data && historyQuery.data.items.length > 0 ? (
        <Card>
          <CardHeader>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Recent {track} Sessions
            </h2>
          </CardHeader>
          <CardContent className="divide-y divide-slate-200 dark:divide-slate-800">
            {historyQuery.data.items.slice(0, 5).map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {item.examTitle}
                  </p>
                  <p className="text-xs text-slate-500">
                    {item.mode} · {item.status}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {item.scoreDisplay ? (
                    <Badge variant="info">{item.scoreDisplay}</Badge>
                  ) : null}
                  {item.status === "COMPLETED" ? (
                    <Link
                      href={`/exams/${track.toLowerCase()}/result/${encodeURIComponent(item.id)}`}
                    >
                      <Button variant="outline" size="sm">
                        View Result
                      </Button>
                    </Link>
                  ) : null}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
