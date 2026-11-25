"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight, LogIn, LogOut, X } from "lucide-react";
import { useEffect } from "react";
import { useLogoutMutation } from "@/features/auth/api/auth-api";
import { WORKSPACE_NAV_ITEMS } from "@/shared/config/navigation";
import { cn } from "@/shared/lib/cn";
import { useAuthStore } from "@/shared/stores/auth-store";
import { useGlobalUiStore } from "@/shared/stores/ui-store";
import { BrandLogo } from "@/shared/ui/BrandLogo";
import { Button } from "@/shared/ui/Button";
import { Badge } from "@/shared/ui/Badge";

function isActivePath(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarNavList({
  collapsed,
  onNavigate,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname() ?? "";
  const user = useAuthStore((s) => s.user);
  const status = useAuthStore((s) => s.status);
  const openLoginModal = useGlobalUiStore((s) => s.openLoginModal);
  const logout = useLogoutMutation();

  const learningItems = WORKSPACE_NAV_ITEMS.filter((i) => i.group === "learning");
  const secondaryItems = WORKSPACE_NAV_ITEMS.filter((i) => i.group !== "learning");

  const renderLink = (item: (typeof WORKSPACE_NAV_ITEMS)[number]) => {
    const Icon = item.icon;
    const active = isActivePath(pathname, item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onNavigate}
        title={collapsed ? item.label : undefined}
        aria-label={collapsed ? item.label : undefined}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
          active
            ? "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/70 dark:hover:text-white",
          collapsed && "justify-center px-2"
        )}
      >
        <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
        {!collapsed ? <span className="truncate">{item.label}</span> : null}
      </Link>
    );
  };

  return (
    <div className="flex h-full flex-col justify-between gap-4 p-3">
      <nav aria-label="Workspace navigation" className="space-y-3">
        <div className="space-y-1">{learningItems.map(renderLink)}</div>
        <div className="space-y-1 border-t border-slate-200 pt-3 dark:border-slate-800">
          {secondaryItems.map(renderLink)}
        </div>
      </nav>

      <div className="border-t border-slate-200 pt-3 dark:border-slate-800">
        {status === "authenticated" && user ? (
          <div className="space-y-2">
            {!collapsed ? (
              <div className="flex items-center justify-between gap-2 px-2">
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-slate-900 dark:text-white">
                    {user.displayName}
                  </p>
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                    @{user.username ?? "onboarding"}
                  </p>
                </div>
                <Badge variant={user.entitlementTier === "FREE" ? "default" : "pro"}>
                  {user.entitlementTier}
                </Badge>
              </div>
            ) : null}
            <Button
              variant="ghost"
              size="sm"
              aria-label={collapsed ? "Sign out" : undefined}
              className={cn("w-full", collapsed ? "justify-center px-2" : "justify-start")}
              onClick={() => logout.mutate()}
              isLoading={logout.isPending}
            >
              <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
              {!collapsed ? <span>Sign out</span> : null}
            </Button>
          </div>
        ) : (
          <Button
            variant="primary"
            size="sm"
            aria-label={collapsed ? "Sign In" : undefined}
            className="w-full"
            onClick={() => openLoginModal()}
          >
            <LogIn className="h-4 w-4 shrink-0" aria-hidden="true" />
            {!collapsed ? <span>Sign In</span> : null}
          </Button>
        )}
      </div>
    </div>
  );
}

export function WorkspaceSidebar() {
  const collapsed = useGlobalUiStore((s) => s.isSidebarCollapsed);
  const toggleCollapsed = useGlobalUiStore((s) => s.toggleSidebarCollapsed);
  const mobileOpen = useGlobalUiStore((s) => s.isMobileDrawerOpen);
  const setMobileOpen = useGlobalUiStore((s) => s.setMobileDrawerOpen);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setMobileOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen, setMobileOpen]);

  return (
    <>
      <aside
        aria-label="Sidebar"
        className={cn(
          "hidden shrink-0 flex-col border-r border-slate-200 bg-white transition-all duration-200 md:flex dark:border-slate-800 dark:bg-slate-900",
          collapsed ? "w-16" : "w-64"
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-3 dark:border-slate-800">
          <Link href="/dashboard" aria-label="LinguaCraft Home">
            <BrandLogo compact={collapsed} />
          </Link>
          <Button
            variant="ghost"
            size="icon"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={toggleCollapsed}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            ) : (
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            )}
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <SidebarNavList collapsed={collapsed} />
        </div>
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-slate-950/50"
            aria-hidden="true"
            onClick={() => setMobileOpen(false)}
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Mobile Navigation"
            className="relative z-10 flex h-full w-72 flex-col bg-white shadow-xl dark:bg-slate-900"
          >
            <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4 dark:border-slate-800">
              <Link href="/dashboard" onClick={() => setMobileOpen(false)}>
                <BrandLogo />
              </Link>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Close navigation menu"
                onClick={() => setMobileOpen(false)}
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <SidebarNavList collapsed={false} onNavigate={() => setMobileOpen(false)} />
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
