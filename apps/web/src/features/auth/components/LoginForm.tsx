"use client";

import { useState, type FormEvent } from "react";
import { Mail, CheckCircle2 } from "lucide-react";
import { magicLinkRequestSchema } from "@linguacraft/contracts";
import { ApiClientError } from "@/shared/api/client";
import { Badge } from "@/shared/ui/Badge";
import { BrandLogo } from "@/shared/ui/BrandLogo";
import { Button } from "@/shared/ui/Button";
import { Card, CardContent, CardHeader } from "@/shared/ui/Card";
import { Input } from "@/shared/ui/Input";
import { useMagicLinkMutation } from "../api/auth-api";
import {
  deriveCodeChallenge,
  generateCodeVerifier,
  savePkceState,
} from "../lib/pkce";

const OAUTH_ENDPOINTS: Record<"google" | "apple", { url: string; clientEnv?: string }> = {
  google: {
    url: "https://accounts.google.com/o/oauth2/v2/auth",
    clientEnv: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
  },
  apple: {
    url: "https://appleid.apple.com/auth/authorize",
    clientEnv: process.env.NEXT_PUBLIC_APPLE_CLIENT_ID,
  },
};

export interface LoginFormProps {
  nextPath?: string;
}

export function LoginForm({ nextPath = "/dashboard" }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const magicLink = useMagicLinkMutation();

  const emailValidation = magicLinkRequestSchema.safeParse({ email });
  const showInlineError = email.trim().length > 0 && !emailValidation.success;
  const inlineMessage = showInlineError
    ? emailValidation.error.issues[0]?.message ?? "Invalid email address"
    : null;

  async function handleOAuthClick(provider: "google" | "apple") {
    setOauthError(null);
    const config = OAUTH_ENDPOINTS[provider];
    if (!config.clientEnv) {
      setOauthError(
        `${provider === "google" ? "Google" : "Apple"} OAuth client ID is not configured in environment.`
      );
      return;
    }

    const state = generateCodeVerifier().slice(0, 24);
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await deriveCodeChallenge(codeVerifier);
    const redirectUri = `${window.location.origin}/auth/callback?provider=${provider}`;

    savePkceState(state, { provider, codeVerifier, nextPath });

    const params = new URLSearchParams({
      client_id: config.clientEnv,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: provider === "google" ? "openid email profile" : "name email",
      state,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    });
    window.location.assign(`${config.url}?${params.toString()}`);
  }

  async function handleEmailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setOauthError(null);
    if (!emailValidation.success) return;

    const result = await magicLink.mutateAsync(emailValidation.data);
    if (result.sent) {
      setSentTo(emailValidation.data.email);
    }
  }

  const serverError =
    magicLink.error instanceof ApiClientError
      ? magicLink.error.message
      : magicLink.error instanceof Error
        ? magicLink.error.message
        : oauthError;

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-3 text-center">
        <div className="flex justify-center">
          <BrandLogo />
        </div>
        <div className="space-y-1">
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            Welcome Back
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Continue your English listening, speaking, and exam preparation
          </p>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {sentTo ? (
          <div
            role="status"
            className="space-y-3 rounded-xl border-2 border-emerald-200 bg-emerald-50/70 p-4 text-center dark:border-emerald-900 dark:bg-emerald-950/30"
          >
            <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600" aria-hidden="true" />
            <div className="space-y-1">
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                Check your inbox
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                We sent a 10-minute sign-in link to{" "}
                <span className="font-semibold">{sentTo}</span>.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSentTo(null);
                magicLink.reset();
              }}
            >
              Use another email
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-2.5">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => void handleOAuthClick("google")}
              >
                Continue with Google
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => void handleOAuthClick("apple")}
              >
                Continue with Apple
              </Button>
            </div>

            <div className="relative flex items-center justify-center">
              <span className="h-px w-full bg-slate-200 dark:bg-slate-800" />
              <span className="bg-white px-3 text-xs font-medium uppercase tracking-wider text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                or continue with
              </span>
              <span className="h-px w-full bg-slate-200 dark:bg-slate-800" />
            </div>

            <form onSubmit={handleEmailSubmit} className="space-y-3" noValidate>
              <div className="space-y-1.5">
                <label
                  htmlFor="login-email"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300"
                >
                  Email address
                </label>
                <Input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  placeholder="Enter your email"
                  value={email}
                  hasError={showInlineError}
                  aria-invalid={showInlineError}
                  aria-describedby={inlineMessage ? "login-email-error" : undefined}
                  onChange={(e) => setEmail(e.target.value)}
                />
                {inlineMessage ? (
                  <p
                    id="login-email-error"
                    role="alert"
                    className="text-xs font-medium text-red-600 dark:text-red-400"
                  >
                    {inlineMessage}
                  </p>
                ) : null}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={!emailValidation.success}
                isLoading={magicLink.isPending}
              >
                <Mail className="h-4 w-4" aria-hidden="true" />
                Continue with Email
              </Button>
            </form>
          </>
        )}

        {serverError ? (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
          >
            {serverError}
          </div>
        ) : null}

        <div className="flex flex-col items-center gap-2 border-t border-slate-100 pt-4 text-center text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
          <Badge variant="info">PKCE &amp; Passwordless Security</Badge>
          <p>
            Explicit audio consent is requested separately before any cloud voice recording.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
