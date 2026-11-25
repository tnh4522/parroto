"use client";

import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useOAuthExchangeMutation } from "@/features/auth/api/auth-api";
import { OnboardingForm } from "@/features/auth/components/OnboardingForm";
import { consumePkceState } from "@/features/auth/lib/pkce";
import { ApiClientError } from "@/shared/api/client";
import { buttonVariants } from "@/shared/ui/Button";
import { ErrorState, LoadingState } from "@/shared/ui/StateBoundary";

function OAuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const exchange = useOAuthExchangeMutation();
  const startedRef = useRef(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [nextPath, setNextPath] = useState("/dashboard");
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const errorParam = searchParams.get("error");

    if (errorParam) {
      setLocalError(`Authorization denied: ${errorParam}`);
      return;
    }
    if (!code || !state) {
      setLocalError("Missing OAuth authorization code or state parameter.");
      return;
    }

    const stored = consumePkceState(state);
    if (!stored) {
      setLocalError("OAuth session expired or invalid PKCE state.");
      return;
    }

    setNextPath(stored.nextPath);
    const redirectUri = `${window.location.origin}/auth/callback?provider=${stored.provider}`;

    exchange
      .mutateAsync({
        provider: stored.provider,
        payload: {
          code,
          codeVerifier: stored.codeVerifier,
          redirectUri,
        },
      })
      .then((res) => {
        if (!res.user.username) {
          setNeedsOnboarding(true);
          return;
        }
        router.replace(stored.nextPath);
      })
      .catch((err: unknown) => {
        const msg =
          err instanceof ApiClientError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Failed to complete OAuth sign-in.";
        setLocalError(msg);
      });
  }, [exchange, router, searchParams]);

  if (needsOnboarding) {
    return <OnboardingForm nextPath={nextPath} />;
  }

  if (localError) {
    return (
      <div className="w-full max-w-md space-y-4">
        <ErrorState title="Sign-in could not complete" message={localError} />
        <div className="flex justify-center">
          <Link href="/login" className={buttonVariants({ variant: "outline" })}>
            Back to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return <LoadingState label="Completing secure PKCE sign-in..." />;
}

export default function OAuthCallbackPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading callback..." />}>
      <OAuthCallbackContent />
    </Suspense>
  );
}
