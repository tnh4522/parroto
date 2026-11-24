"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { onboardingUpdateSchema } from "@linguacraft/contracts";
import { ApiClientError } from "@/shared/api/client";
import { Button } from "@/shared/ui/Button";
import { Card, CardContent, CardHeader } from "@/shared/ui/Card";
import { Input } from "@/shared/ui/Input";
import { useOnboardingMutation } from "../api/auth-api";

export function OnboardingForm({ nextPath = "/dashboard" }: { nextPath?: string }) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [preferredTranslateLang, setPreferredTranslateLang] = useState("vi");
  const [validationError, setValidationError] = useState<string | null>(null);
  const onboarding = useOnboardingMutation();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setValidationError(null);

    const candidate = {
      username,
      birthDate: birthDate.trim() ? birthDate.trim() : undefined,
      preferredTranslateLang,
    };

    const parsed = onboardingUpdateSchema.safeParse(candidate);
    if (!parsed.success) {
      setValidationError(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }

    await onboarding.mutateAsync(parsed.data);
    router.replace(nextPath);
  }

  const serverError =
    onboarding.error instanceof ApiClientError
      ? onboarding.error.message
      : onboarding.error instanceof Error
        ? onboarding.error.message
        : null;

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">
          Complete Your Profile
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Choose a unique handle and learning language before entering the workspace.
        </p>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <label
              htmlFor="onboarding-username"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300"
            >
              Username
            </label>
            <Input
              id="onboarding-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. alex_learner"
              hasError={Boolean(validationError)}
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="onboarding-birthdate"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300"
            >
              Date of Birth (Optional — required for private chat)
            </label>
            <Input
              id="onboarding-birthdate"
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="onboarding-translate-lang"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300"
            >
              Translation Language
            </label>
            <select
              id="onboarding-translate-lang"
              value={preferredTranslateLang}
              onChange={(e) => setPreferredTranslateLang(e.target.value)}
              className="flex h-10 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              <option value="vi">Vietnamese</option>
              <option value="ja">Japanese</option>
              <option value="ko">Korean</option>
              <option value="es">Spanish</option>
              <option value="zh-CN">Chinese (Simplified)</option>
              <option value="en">English Definitions Only</option>
            </select>
          </div>

          {validationError || serverError ? (
            <p
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
            >
              {validationError ?? serverError}
            </p>
          ) : null}

          <Button type="submit" className="w-full" isLoading={onboarding.isPending}>
            Save &amp; Continue
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
