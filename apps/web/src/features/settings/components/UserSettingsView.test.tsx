import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "@/shared/api/api-client";
import { useAuthStore } from "@/shared/stores/auth-store";
import { useGlobalUiStore } from "@/shared/stores/ui-store";
import { UserSettingsView } from "./UserSettingsView";

describe("UserSettingsView", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useGlobalUiStore.setState({ theme: "light" });
    useAuthStore.setState({
      accessToken: "tok",
      status: "authenticated",
      user: {
        id: "11111111-1111-4111-8111-111111111111",
        email: "settings@example.com",
        username: "learner99",
        displayName: "Learner 99",
        role: "USER",
        entitlementTier: "FREE",
        ageVerified: false,
        preferredUiLocale: "en",
        preferredTranslateLang: "vi",
      },
    });
  });

  it("updates display name, translation language, and birth date via PATCH /users/me/preferences", async () => {
    const user = userEvent.setup();
    const requestSpy = vi
      .spyOn(apiClient, "request")
      .mockImplementation(async (path) => {
        if (path === "/users/me/preferences") {
          return {
            user: {
              id: "11111111-1111-4111-8111-111111111111",
              email: "settings@example.com",
              username: "learner99",
              displayName: "Alex Rivera",
              role: "USER",
              entitlementTier: "FREE",
              ageVerified: true,
              preferredUiLocale: "en",
              preferredTranslateLang: "ja",
            },
          };
        }
        return {};
      });

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <UserSettingsView />
      </QueryClientProvider>
    );

    const nameInput = screen.getByLabelText(/display name/i);
    await user.clear(nameInput);
    await user.type(nameInput, "Alex Rivera");

    await user.selectOptions(
      screen.getByLabelText(/subtitle translation language/i),
      "ja"
    );

    await user.type(screen.getByLabelText(/birth date/i), "1999-05-14");
    await user.click(screen.getByRole("button", { name: /save preferences/i }));

    await waitFor(() => {
      expect(requestSpy).toHaveBeenCalledWith(
        "/users/me/preferences",
        expect.objectContaining({
          method: "PATCH",
          body: expect.objectContaining({
            displayName: "Alex Rivera",
            preferredTranslateLang: "ja",
            birthDate: "1999-05-14",
          }),
        })
      );
    });

    expect(screen.getByText("Settings saved.")).toBeInTheDocument();
    expect(screen.getByText("Age Verified")).toBeInTheDocument();
  });

  it("signs out via POST /auth/logout and clears session", async () => {
    const user = userEvent.setup();
    const requestSpy = vi.spyOn(apiClient, "request").mockResolvedValueOnce(undefined);

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <UserSettingsView />
      </QueryClientProvider>
    );

    await user.click(screen.getByRole("button", { name: /sign out/i }));

    await waitFor(() => {
      expect(requestSpy).toHaveBeenCalledWith("/auth/logout", { method: "POST" });
    });
    expect(useAuthStore.getState().status).toBe("guest");
  });
});
