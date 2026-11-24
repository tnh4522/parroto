import Link from "next/link";
import { ArrowRight, FileCheck2, Headphones, Layers, Mic } from "lucide-react";
import { Card, CardContent } from "@/shared/ui/Card";
import { MarketingShell } from "@/shared/ui/MarketingShell";
import { Button } from "@/shared/ui/Button";

const CAPABILITIES = [
  {
    href: "/dictation",
    title: "Audio Dictation",
    desc: "Sentence-by-sentence listening drills with speed control and accuracy checks.",
    icon: Headphones,
  },
  {
    href: "/shadowing",
    title: "Phonetic Shadowing",
    desc: "On-device speech recognition with IPA alignment feedback and mic playback.",
    icon: Mic,
  },
  {
    href: "/flashcards",
    title: "Spaced Repetition",
    desc: "SM-2 vocabulary scheduling synced across personal and curated decks.",
    icon: Layers,
  },
  {
    href: "/exams/ielts",
    title: "IELTS & TOEIC Mocks",
    desc: "Timed Test Mode and instant-check Practice Mode with band & scaled scoring.",
    icon: FileCheck2,
  },
];

export default function HomePage() {
  return (
    <MarketingShell>
      <main className="mx-auto max-w-6xl space-y-12 px-4 py-14 sm:px-6">
        <section className="space-y-5 text-center">
          <h1 className="mx-auto max-w-3xl text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl dark:text-white">
            Master English Through Active Listening, Speaking &amp; Exam Practice
          </h1>
          <p className="mx-auto max-w-2xl text-base text-slate-600 dark:text-slate-300">
            Browser-native audio synchronization, spaced-repetition flashcards, and
            full-length IELTS and TOEIC simulations.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link href="/dashboard">
              <Button size="lg">
                Enter Workspace
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="lg">
                Sign In
              </Button>
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
              <Link key={cap.href} href={cap.href} className="group block">
                <Card className="h-full transition-colors group-hover:border-blue-500/60">
                  <CardContent className="space-y-2 p-5">
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-300">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">
                      {cap.title}
                    </h2>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
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
