"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  CheckCircle2,
  Lock,
  LogOut,
  Moon,
  ShieldCheck,
  Sparkles,
  Sun,
} from "lucide-react";
import { userPreferencesUpdateSchema } from "@linguacraft/contracts";
import { useLogoutMutation } from "@/features/auth/api/auth-api";
import { useUpdatePreferencesMutation } from "@/features/settings/api/settings-api";
import { useAuthStore } from "@/shared/stores/auth-store";
import { useGlobalUiStore } from "@/shared/stores/ui-store";
import { Badge } from "@/shared/ui/Badge";
import { Button } from "@/shared/ui/Button";
import { Card, CardContent, CardHeader } from "@/shared/ui/Card";
import { Input } from "@/shared/ui/Input";
import { LoadingState } from "@/shared/ui/StateBoundary";

export function UserSettingsView() {
  const user = useAuthStore((s) => s.user);
  const authStatus = useAuthStore((s) => s.status);
  const openLoginModal = useGlobalUiStore((s) => s.openLoginModal);
  const theme = useGlobalUiStore((s) => s.theme);
  const toggleTheme = useGlobalUiStore((s) => s.toggleTheme);

  const updatePreferencesMutation = useUpdatePreferencesMutation();
  const logoutMutation = useLogoutMutation();

  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [preferredUiLocale, setPreferredUiLocale] = useState<"en" | "vi">(
    user?.preferredUiLocale === "vi" ? "vi" : "en"
  );
  const [preferredTranslateLang, setPreferredTranslateLang] = useState(
    user?.preferredTranslateLang ?? "vi"
  );
  const [birthDate, setBirthDate] = useState("");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setDisplayName(user.displayName);
    setPreferredUiLocale(user.preferredUiLocale === "vi" ? "vi" : "en");
    setPreferredTranslateLang(user.preferredTranslateLang);
  }, [user]);

  if (authStatus === "loading") {
    return <LoadingState label="Loading settings..." />;
  }

  if (authStatus === "guest" || !user) {
    return (
      <div className="mx-auto max-w-xl space-y-6">
        <Card>
          <CardHeader>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              Settings
            </h1>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-xl border border-slate-200 p-4 dark:border-slate-800">
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  Appearance
                </p>
                <p className="text-xs text-slate-500">
                  Current theme: <span className="capitalize">{theme}</span>
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={toggleTheme}>
                {theme === "dark" ? (
                  <>
                    <Sun className="h-4 w-4" aria-hidden="true" />
                    Light Mode
                  </>
                ) : (
                  <>
                    <Moon className="h-4 w-4" aria-hidden="true" />
                    Dark Mode
                  </>
                )}
              </Button>
            </div>

            <div className="flex flex-col items-center gap-3 rounded-xl bg-slate-50 p-6 text-center dark:bg-slate-950">
              <Lock className="h-8 w-8 text-blue-600" aria-hidden="true" />
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Sign in to manage your profile, subtitle languages, and age
                verification.
              </p>
              <Button
                variant="primary"
                onClick={() => openLoginModal("Sign in to configure account settings.")}
              >
                Sign in
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);
    setSaveMessage(null);

    const parsed = userPreferencesUpdateSchema.safeParse({
      displayName,
      preferredUiLocale,
      preferredTranslateLang,
      birthDate: birthDate.trim() ? birthDate.trim() : undefined,
    });

    if (!parsed.success) {
      setFormError(
        parsed.error.issues[0]?.message ?? "Please review your profile inputs."
      );
      return;
    }

    try {
      await updatePreferencesMutation.mutateAsync(parsed.data);
      setSaveMessage("Settings saved.");
      setBirthDate("");
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Could not save preferences."
      );
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Account &amp; Learning Settings
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Manage profile details, translation defaults, appearance, and account status.
        </p>
      </div>

      {/* Membership & Session Summary */}
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-base font-bold text-slate-900 dark:text-white">
                {user.displayName}
              </span>
              {user.username ? (
                <span className="text-xs font-medium text-slate-500">
                  @{user.username}
                </span>
              ) : null}
              <Badge
                variant={user.entitlementTier === "FREE" ? "default" : "pro"}
              >
                {user.entitlementTier !== "FREE" ? (
                  <Sparkles className="h-3 w-3" aria-hidden="true" />
                ) : null}
                {user.entitlementTier}
              </Badge>
            </div>
            <p className="text-xs text-slate-500">{user.email}</p>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            isLoading={logoutMutation.isPending}
            onClick={() => void logoutMutation.mutateAsync()}
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Sign Out
          </Button>
        </CardContent>
      </Card>

      {/* Profile & Preferences Form */}
      <Card>
        <CardHeader>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Profile &amp; Learning Preferences
          </h2>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <label className="block space-y-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
              <span>Display Name</span>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your display name"
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
                <span>Interface Language</span>
                <select
                  aria-label="Interface Language"
                  value={preferredUiLocale}
                  onChange={(e) =>
                    setPreferredUiLocale(e.target.value === "vi" ? "vi" : "en")
                  }
                  className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
                >
                  <option value="en">English (en)</option>
                  <option value="vi">Tiếng Việt (vi)</option>
                </select>
              </label>

              <label className="block space-y-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
                <span>Subtitle Translation Language</span>
                <select
                  aria-label="Subtitle Translation Language"
                  value={preferredTranslateLang}
                  onChange={(e) => setPreferredTranslateLang(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
                >
                  <option value="vi">Vietnamese (vi)</option>
                  <option value="en">English (en)</option>
                  <option value="ja">Japanese (ja)</option>
                  <option value="ko">Korean (ko)</option>
                  <option value="es">Spanish (es)</option>
                </select>
              </label>
            </div>

            {/* Age Verification */}
            <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck
                    className="h-4 w-4 text-emerald-600"
                    aria-hidden="true"
                  />
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">
                    Community Voice Room Eligibility
                  </span>
                </div>
                <Badge variant={user.ageVerified ? "success" : "warning"}>
                  {user.ageVerified ? "Age Verified" : "Verification Needed"}
                </Badge>
              </div>
              {!user.ageVerified ? (
                <div className="mt-3 space-y-2">
                  <p className="text-xs text-slate-500">
                    Enter your birth date (YYYY-MM-DD) to verify community room
                    eligibility.
                  </p>
                  <Input
                    type="date"
                    aria-label="Birth Date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                  />
                </div>
              ) : null}
            </div>

            {formError ? (
              <p role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">
                {formError}
              </p>
            ) : null}

            {saveMessage ? (
              <p
                role="status"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400"
              >
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                {saveMessage}
              </p>
            ) : null}

            <div className="flex justify-end">
              <Button
                type="submit"
                variant="primary"
                isLoading={updatePreferencesMutation.isPending}
              >
                Save Preferences
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Theme Preferences */}
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Theme Mode
            </h2>
            <p className="text-xs text-slate-500">
              Switch between crisp light surface and eye-friendly dark mode.
            </p>
          </div>
          <Button type="button" variant="outline" onClick={toggleTheme}>
            {theme === "dark" ? (
              <>
                <Sun className="h-4 w-4" aria-hidden="true" />
                Switch to Light
              </>
            ) : (
              <>
                <Moon className="h-4 w-4" aria-hidden="true" />
                Switch to Dark
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
