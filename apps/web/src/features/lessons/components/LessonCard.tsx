import Link from "next/link";
import { Clock, Headphones, Mic, PlayCircle, Sparkles } from "lucide-react";
import type { LessonSummary } from "@linguacraft/contracts";
import { Badge } from "@/shared/ui/Badge";
import { buttonVariants } from "@/shared/ui/Button";
import { Card, CardContent } from "@/shared/ui/Card";

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export function LessonCard({ lesson }: { lesson: LessonSummary }) {
  return (
    <Card className="flex h-full flex-col justify-between transition-colors hover:border-blue-400/70">
      <CardContent className="flex flex-1 flex-col justify-between gap-4 p-4">
        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="info">{lesson.cefrLevel}</Badge>
              {lesson.isPro ? (
                <Badge variant="pro">
                  <Sparkles className="h-3 w-3" aria-hidden="true" />
                  PRO
                </Badge>
              ) : (
                <Badge variant="success">Free</Badge>
              )}
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              {formatDuration(lesson.durationSec)}
            </span>
          </div>

          <div className="space-y-1">
            <h3 className="line-clamp-2 text-sm font-bold text-slate-900 dark:text-white">
              {lesson.title}
            </h3>
            {lesson.description ? (
              <p className="line-clamp-2 text-xs text-slate-600 dark:text-slate-400">
                {lesson.description}
              </p>
            ) : null}
          </div>

          {lesson.topics.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {lesson.topics.slice(0, 3).map((topic) => (
                <span
                  key={topic}
                  className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                >
                  #{topic}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2">
          <Link
            href={`/dictation/${encodeURIComponent(lesson.slug)}`}
            className={buttonVariants({ variant: "outline", size: "sm", className: "w-full" })}
          >
            <Headphones className="h-3.5 w-3.5" aria-hidden="true" />
            Dictation
          </Link>
          <Link
            href={`/shadowing/${encodeURIComponent(lesson.slug)}`}
            className={buttonVariants({ variant: "primary", size: "sm", className: "w-full" })}
          >
            {lesson.mediaType === "AUDIO" ? (
              <PlayCircle className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <Mic className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            Shadowing
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
