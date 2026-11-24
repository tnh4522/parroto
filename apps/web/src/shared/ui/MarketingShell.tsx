"use client";

import Link from "next/link";
import { Menu, Moon, Sun, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useGlobalUiStore } from "@/shared/stores/ui-store";
import { BrandLogo } from "@/shared/ui/BrandLogo";
import { Button } from "@/shared/ui/Button";
import { LoginModal } from "@/shared/ui/LoginModal";

const MARKETING_LINKS = [
  { href: "/dictation", label: "Dictation" },
  { href: "/shadowing", label: "Shadowing" },
  { href: "/vocabulary", label: "Vocabulary" },
  { href: "/speaking", label: "Speaking" },
  { href: "/exams/ielts", label: "IELTS Exams" },
  { href: "/exams/toeic", label: "TOEIC Exams" },
];

export function MarketingShell({ children }: { children: ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const toggleTheme = useGlobalUiStore((s) => s.toggleTheme);
  const theme = useGlobalUiStore((s) => s.theme);
  const openLoginModal = useGlobalUiStore((s) => s.openLoginModal);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-950">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" aria-label="LinguaCraft Home">
            <BrandLogo />
          </Link>

          <nav aria-label="Primary" className="hidden items-center gap-6 md:flex">
            {MARKETING_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-semibold text-slate-600 transition-colors hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
              onClick={toggleTheme}
            >
              {theme === "light" ? (
                <Moon className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Sun className="h-4 w-4" aria-hidden="true" />
              )}
            </Button>

            <div className="hidden sm:flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => openLoginModal()}>
                Sign In
              </Button>
              <Link href="/dashboard">
                <Button size="sm">Open Workspace</Button>
              </Link>
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              onClick={() => setMobileMenuOpen((v) => !v)}
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Menu className="h-5 w-5" aria-hidden="true" />
              )}
            </Button>
          </div>
        </div>

        {mobileMenuOpen ? (
          <nav
            aria-label="Mobile menu"
            className="border-t border-slate-200 bg-white px-4 py-4 md:hidden dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex flex-col gap-2">
              {MARKETING_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-xl bg-blue-600 px-3 py-2 text-center text-sm font-semibold text-white"
              >
                Sign In
              </Link>
            </div>
          </nav>
        ) : null}
      </header>

      <div className="flex-1">{children}</div>

      <footer className="border-t border-slate-200 bg-white py-8 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6">
          <BrandLogo />
          <p className="text-xs">
            Independent open-architecture English learning workspace.
          </p>
        </div>
      </footer>
      <LoginModal />
    </div>
  );
}
