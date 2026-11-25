import Link from "next/link";
import { ArrowRight, FileCheck2, Headphones, Layers, Mic } from "lucide-react";
import { Card, CardContent } from "@/shared/ui/Card";
import { MarketingShell } from "@/shared/ui/MarketingShell";
import { buttonVariants } from "@/shared/ui/Button";

const CAPABILITIES = [
  {
    href: "/dictation",
    title: "Audio Dictation",
    desc: "Sentence-by-sentence listening drills with speed control and instant word checks.",
    icon: Headphones,
  },
  {
    href: "/shadowing",
    title: "Voice Shadowing",
    desc: "Speak along with native cues using browser speech matching and IPA reference.",
    icon: Mic,
  },
  {
    href: "/flashcards",
    title: "Spaced Repetition",
    desc: "Deterministic SM-2 flashcard scheduling across personal and curated study decks.",
    icon: Layers,
  },
  {
    href: "/exams/ielts",
    title: "IELTS & TOEIC Mocks",
    desc: "Timed Test Mode and instant-check Practice Mode with band and scaled scores.",
    icon: FileCheck2,
  },
];

export default function HomePage() {
  return (
    <MarketingShell>
      <main className="mx-auto max-w-6xl space-y-12 px-4 py-14 sm:px-6">
        <section className="space-y-5 text-center">
          <h1 className="mx-auto max-w-3xl text-balance text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl dark:text-white">
            Active English Listening, Speaking &amp; Exam Practice
          </h1>
          <p className="mx-auto max-w-2xl text-base text-slate-600 dark:text-slate-300">
            Synchronized sentence audio drills, SM-2 spaced-repetition flashcards, and
            full-length IELTS and TOEIC simulations in one focused studio.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link href="/dashboard" className={buttonVariants({ size: "lg" })}>
              Open Workspace
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="/login"
              className={buttonVariants({ variant: "outline", size: "lg" })}
            >
              Sign In
            </Link>
          </div>
        </section>

        <section
          aria-label="Learning modules"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {CAPABILITIES.map((cap) => {
            const Icon = cap.icon;
            return (
              <Link
                key={cap.href}
                href={cap.href}
                className="group block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <Card className="h-full transition-colors group-hover:border-blue-500/60">
                  <CardContent className="space-y-2.5 p-5">
                    <div className="flex items-center gap-2.5">
                      <Icon
                        className="h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400"
                        aria-hidden="true"
                      />
                      <h2 className="text-base font-bold text-slate-900 dark:text-white">
                        {cap.title}
                      </h2>
                    </div>
                    <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                      {cap.desc}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </section>
      </main>
    </MarketingShell>
  );
}
