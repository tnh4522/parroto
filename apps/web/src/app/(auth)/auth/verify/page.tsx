"use client";

import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authUserSchema, refreshTokenResponseSchema } from "@linguacraft/contracts";
import { OnboardingForm } from "@/features/auth/components/OnboardingForm";
import { apiClient } from "@/shared/api/api-client";
import { ApiClientError } from "@/shared/api/client";
import { useAuthStore } from "@/shared/stores/auth-store";
import { buttonVariants } from "@/shared/ui/Button";
import { ErrorState, LoadingState } from "@/shared/ui/StateBoundary";

function VerifyMagicLinkContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const startedRef = useRef(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const nextPath = searchParams.get("next") || "/dashboard";

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const token = searchParams.get("token");
    if (!token) {
      setErrorMessage("Verification token is missing or malformed.");
      return;
    }

    (async () => {
      try {
        const res = await apiClient.request(
          `/auth/magic-link/verify?token=${encodeURIComponent(token)}`,
          {
            method: "POST",
            schema: refreshTokenResponseSchema,
            skipAuthRefresh: true,
          }
        );
        useAuthStore.getState().setAccessToken(res.accessToken);
        const me = await apiClient.request("/users/me", {
          schema: authUserSchema,
        });
        useAuthStore.getState().setSession(res.accessToken, me);

        if (!me.username) {
          setNeedsOnboarding(true);
          return;
        }
        router.replace(nextPath);
      } catch (err: unknown) {
        if (err instanceof ApiClientError && err.code === "USERNAME_REQUIRED") {
          setNeedsOnboarding(true);
          return;
        }
        setErrorMessage(
          err instanceof Error ? err.message : "Magic link verification failed."
        );
      }
    })();
  }, [nextPath, router, searchParams]);

  if (needsOnboarding) {
    return <OnboardingForm nextPath={nextPath} />;
  }

  if (errorMessage) {
    return (
      <div className="w-full max-w-md space-y-4">
        <ErrorState title="Link invalid or expired" message={errorMessage} />
        <div className="flex justify-center">
          <Link href="/login" className={buttonVariants({ variant: "outline" })}>
            Request a new link
          </Link>
        </div>
      </div>
    );
  }

  return <LoadingState label="Verifying sign-in link..." />;
}

export default function VerifyMagicLinkPage() {
  return (
    <Suspense fallback={<LoadingState label="Checking verification token..." />}>
      <VerifyMagicLinkContent />
    </Suspense>
  );
}
