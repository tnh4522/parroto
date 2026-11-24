"use client";

import { X } from "lucide-react";
import { LoginForm } from "@/features/auth/components/LoginForm";
import { useGlobalUiStore } from "@/shared/stores/ui-store";
import { Button } from "@/shared/ui/Button";

export function LoginModal() {
  const isOpen = useGlobalUiStore((s) => s.isLoginModalOpen);
  const reason = useGlobalUiStore((s) => s.loginReason);
  const close = useGlobalUiStore((s) => s.closeLoginModal);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Sign in required"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
    >
      <div className="relative w-full max-w-md space-y-2">
        <div className="flex justify-end">
          <Button
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
