"use client";

import Link from "next/link";
import { Award, Flame, Gem, Headphones, Layers, Mic, Snowflake, Trophy } from "lucide-react";
import { LessonCard } from "@/features/lessons/components/LessonCard";
import { ApiClientError } from "@/shared/api/client";
import { useAuthStore } from "@/shared/stores/auth-store";
import { useGlobalUiStore } from "@/shared/stores/ui-store";
import { Button, buttonVariants } from "@/shared/ui/Button";
import { Card, CardContent } from "@/shared/ui/Card";
import { EmptyState, ErrorState, LoadingState } from "@/shared/ui/StateBoundary";
import { useDailyLessonsQuery, useStreakCheckinMutation } from "../api/dashboard-api";

export function DashboardView() {
  const user = useAuthStore((s) => s.user);
  const status = useAuthStore((s) => s.status);
  const openLoginModal = useGlobalUiStore((s) => s.openLoginModal);
  const dailyQuery = useDailyLessonsQuery();
  const checkin = useStreakCheckinMutation();

  const stats = user?.stats;
  const isAuth = status === "authenticated" && Boolean(user);

  function handleCheckin() {
    if (!isAuth) {
      openLoginModal("Sign in to record your daily check-in and earn rewards.");
      return;
    }
    checkin.mutate();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            {isAuth && user ? `Welcome back, ${user.displayName}` : "Learning Dashboard"}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Track your daily streak, jump into quick reviews, and explore featured lessons.
          </p>
        </div>

        <Button onClick={handleCheckin} isLoading={checkin.isPending}>
          <Flame className="h-4 w-4" aria-hidden="true" />
          Daily Check-In
        </Button>
      </div>

      {checkin.isSuccess ? (
        <div
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
        >
          Check-in recorded: +{checkin.data.diamondsEarned} diamonds ·{" "}
          {checkin.data.currentStreakDays}-day streak.
        </div>
      ) : checkin.isError ? (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
        >
          {checkin.error instanceof ApiClientError
            ? checkin.error.message
            : checkin.error.message}
        </div>
      ) : null}

      <section aria-label="Progress summary" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-xl bg-orange-100 p-2.5 text-orange-600 dark:bg-orange-950/60 dark:text-orange-400">
              <Flame className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">Streak</p>
              <p className="text-xl font-extrabold">{stats?.currentStreakDays ?? 0} days</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-xl bg-blue-100 p-2.5 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <Trophy className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">Experience</p>
              <p className="text-xl font-extrabold">
                {stats?.xpTotal ?? 0} XP · Lv.{stats?.level ?? 1}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-xl bg-sky-100 p-2.5 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400">
              <Gem className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">Diamonds</p>
              <p className="text-xl font-extrabold">{stats?.diamondBalance ?? 0}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-xl bg-indigo-100 p-2.5 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
              <Snowflake className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">Freezes</p>
              <p className="text-xl font-extrabold">{stats?.streakFreezesOwned ?? 0}</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section aria-label="Quick actions" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Link href="/dictation">
          <Card className="transition-colors hover:border-blue-500/60">
            <CardContent className="flex items-center gap-3 p-4">
              <Headphones className="h-5 w-5 text-blue-600" aria-hidden="true" />
              <div>
                <p className="text-sm font-bold">Listen &amp; Type Dictation</p>
                <p className="text-xs text-slate-500">Sharpen listening accuracy</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/shadowing">
          <Card className="transition-colors hover:border-blue-500/60">
            <CardContent className="flex items-center gap-3 p-4">
              <Mic className="h-5 w-5 text-emerald-600" aria-hidden="true" />
              <div>
                <p className="text-sm font-bold">Shadowing Pronunciation</p>
                <p className="text-xs text-slate-500">Speak with IPA feedback</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/flashcards">
          <Card className="transition-colors hover:border-blue-500/60">
            <CardContent className="flex items-center gap-3 p-4">
              <Layers className="h-5 w-5 text-amber-600" aria-hidden="true" />
              <div>
                <p className="text-sm font-bold">SRS Flashcard Review</p>
                <p className="text-xs text-slate-500">Review scheduled words</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </section>

      <section aria-label="Featured daily lessons" className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-blue-600" aria-hidden="true" />
            <h2 className="text-lg font-bold">Today&apos;s Featured Lessons</h2>
          </div>
          <Link
            href="/lessons"
            className="text-xs font-semibold text-blue-600 hover:underline"
          >
            Browse all lessons
          </Link>
        </div>

        {dailyQuery.isLoading ? (
          <LoadingState label="Loading daily lessons..." />
        ) : dailyQuery.isError ? (
          <ErrorState
            message={dailyQuery.error.message}
            onRetry={() => void dailyQuery.refetch()}
          />
        ) : dailyQuery.data && dailyQuery.data.items.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {dailyQuery.data.items.map((lesson) => (
              <LessonCard key={lesson.id} lesson={lesson} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No featured lessons today"
            description="Explore the full lesson library to choose a topic and CEFR level."
            action={
              <Link
                href="/lessons"
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Open Lesson Library
              </Link>
            }
          />
        )}
      </section>
    </div>
  );
}
