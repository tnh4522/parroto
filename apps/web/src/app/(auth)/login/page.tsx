import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/features/auth/components/LoginForm";
import { LoadingState } from "@/shared/ui/StateBoundary";

export const metadata: Metadata = {
  title: "Sign In",
};

export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingState label="Preparing sign-in..." />}>
      <LoginForm />
    </Suspense>
  );
}
