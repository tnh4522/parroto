import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { apiClient } from "@/shared/api/api-client";
import { OnboardingForm } from "./OnboardingForm";

const replaceMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock, push: vi.fn() }),
}));

describe("OnboardingForm", () => {
  it("validates username constraints and saves onboarding data", async () => {
    const user = userEvent.setup();
    const requestSpy = vi.spyOn(apiClient, "request").mockResolvedValueOnce({
      user: {
        id: "11111111-1111-4111-8111-111111111111",
        email: "learner@example.com",
        username: "alex_dev",
        displayName: "Alex",
        role: "USER",
        entitlementTier: "FREE",
        ageVerified: true,
        preferredUiLocale: "en",
        preferredTranslateLang: "vi",
      },
    });

    const qc = new QueryClient();
    render(
      <QueryClientProvider client={qc}>
        <OnboardingForm nextPath="/dashboard" />
      </QueryClientProvider>
    );

    await user.type(screen.getByLabelText(/username/i), "a!");
    await user.click(screen.getByRole("button", { name: /save & continue/i }));
    expect(screen.getByRole("alert")).toHaveTextContent(/at least 3 characters/i);

    await user.clear(screen.getByLabelText(/username/i));
    await user.type(screen.getByLabelText(/username/i), "alex_dev");
    await user.click(screen.getByRole("button", { name: /save & continue/i }));

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/dashboard");
    });
    expect(requestSpy).toHaveBeenCalledWith(
      "/users/me/onboarding",
      expect.objectContaining({ method: "PATCH" })
    );
  });
});
