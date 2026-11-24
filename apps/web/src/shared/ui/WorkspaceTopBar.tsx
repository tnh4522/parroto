"use client";

import Link from "next/link";
import { Menu, Moon, Search, Sun } from "lucide-react";
import { useAuthStore } from "@/shared/stores/auth-store";
import { useGlobalUiStore } from "@/shared/stores/ui-store";
import { BrandLogo } from "@/shared/ui/BrandLogo";
import { Button } from "@/shared/ui/Button";

export function WorkspaceTopBar() {
  const setMobileOpen = useGlobalUiStore((s) => s.setMobileDrawerOpen);
  const openDictionary = useGlobalUiStore((s) => s.openDictionaryModal);
  const openLoginModal = useGlobalUiStore((s) => s.openLoginModal);
  const toggleTheme = useGlobalUiStore((s) => s.toggleTheme);
  const theme = useGlobalUiStore((s) => s.theme);
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
      <div className="flex items-center gap-2 md:hidden">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Open menu"
          onClick={() => setMobileOpen(true)}
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </Button>
        <Link href="/dashboard" aria-label="LinguaCraft Home">
          <BrandLogo compact />
        </Link>
      </div>

      <div className="flex flex-1 items-center justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => openDictionary()}
          className="gap-2"
        >
          <Search className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">Search dictionary</span>
        </Button>

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

        {status === "authenticated" && user ? (
          <Link
            href="/settings"
            className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            {user.displayName}
          </Link>
        ) : (
          <Button size="sm" onClick={() => openLoginModal()}>
            Sign In
          </Button>
        )}
      </div>
    </header>
  );
}
