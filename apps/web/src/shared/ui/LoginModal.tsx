"use client";

import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import { LoginForm } from "@/features/auth/components/LoginForm";
import { useGlobalUiStore } from "@/shared/stores/ui-store";
import { Button } from "@/shared/ui/Button";

export function LoginModal() {
  const isOpen = useGlobalUiStore((s) => s.isLoginModalOpen);
  const reason = useGlobalUiStore((s) => s.loginReason);
  const close = useGlobalUiStore((s) => s.closeLoginModal);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      requestAnimationFrame(() => closeBtnRef.current?.focus());
    } else if (previousFocusRef.current) {
      previousFocusRef.current.focus();
      previousFocusRef.current = null;
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, close]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Sign in required"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
    >
      <div className="relative w-full max-w-md space-y-2">
        <div className="flex justify-end">
          <Button
            ref={closeBtnRef}
            variant="secondary"
            size="icon"
            aria-label="Close login modal"
            onClick={close}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
        {reason ? (
          <p className="rounded-xl bg-blue-600 px-3 py-2 text-center text-xs font-semibold text-white">
            {reason}
          </p>
        ) : null}
        <LoginForm />
      </div>
    </div>
  );
}
