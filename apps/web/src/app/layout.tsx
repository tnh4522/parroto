import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppProviders } from "@/shared/providers/AppProviders";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "LinguaCraft — Independent English Learning Platform",
    template: "%s | LinguaCraft",
  },
  description:
    "Practice English listening dictation, phonetic shadowing, spaced-repetition vocabulary, and IELTS/TOEIC mock exams.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
