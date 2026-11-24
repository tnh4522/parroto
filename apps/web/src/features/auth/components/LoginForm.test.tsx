import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "@/shared/api/api-client";
import { LoginForm } from "./LoginForm";

function renderWithQuery(ui: React.ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe("LoginForm", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("disables submit and displays Zod validation message for invalid email", async () => {
    const user = userEvent.setup();
    renderWithQuery(<LoginForm />);

    const input = screen.getByLabelText(/email address/i);
    const submit = screen.getByRole("button", { name: /continue with email/i });

    expect(submit).toBeDisabled();
    await user.type(input, "not-an-email");
    expect(screen.getByRole("alert")).toHaveTextContent(/valid email/i);
    expect(submit).toBeDisabled();
  });

  it("submits valid email to /auth/magic-link and shows inbox confirmation", async () => {
    const user = userEvent.setup();
    const requestSpy = vi
      .spyOn(apiClient, "request")
      .mockResolvedValueOnce({ sent: true });

    renderWithQuery(<LoginForm />);

    await user.type(screen.getByLabelText(/email address/i), "learner@example.com");
    const submit = screen.getByRole("button", { name: /continue with email/i });
    expect(submit).toBeEnabled();
    await user.click(submit);

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(/check your inbox/i);
    });
    expect(requestSpy).toHaveBeenCalledWith(
      "/auth/magic-link",
      expect.objectContaining({
        method: "POST",
        body: { email: "learner@example.com" },
      })
    );
  });
});
