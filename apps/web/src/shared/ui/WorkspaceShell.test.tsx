import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useGlobalUiStore } from "@/shared/stores/ui-store";
import { WorkspaceShell } from "./WorkspaceShell";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dictation",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

describe("WorkspaceShell & Sidebar Navigation", () => {
  beforeEach(() => {
    useGlobalUiStore.setState({
      isSidebarCollapsed: false,
      isMobileDrawerOpen: false,
      isLoginModalOpen: false,
      isDictionaryModalOpen: false,
    });
  });

  it("highlights active route and toggles desktop sidebar collapse", async () => {
    const user = userEvent.setup();
    const qc = new QueryClient();
    render(
      <QueryClientProvider client={qc}>
        <WorkspaceShell>
          <div>Workspace body</div>
        </WorkspaceShell>
      </QueryClientProvider>
    );

    const activeLink = screen.getByRole("link", { name: "Dictation" });
    expect(activeLink).toHaveAttribute("aria-current", "page");

    await user.click(screen.getByRole("button", { name: /collapse sidebar/i }));
    expect(useGlobalUiStore.getState().isSidebarCollapsed).toBe(true);
    expect(
      screen.getByRole("button", { name: /expand sidebar/i })
    ).toBeInTheDocument();
  });

  it("opens mobile drawer and dictionary modal from top bar", async () => {
    const user = userEvent.setup();
    const qc = new QueryClient();
    render(
      <QueryClientProvider client={qc}>
        <WorkspaceShell>
          <div>Content</div>
        </WorkspaceShell>
      </QueryClientProvider>
    );

    await user.click(screen.getByRole("button", { name: /open menu/i }));
    expect(
      screen.getByRole("dialog", { name: /mobile navigation/i })
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /search dictionary/i }));
    expect(
      screen.getByRole("dialog", { name: /english dictionary/i })
    ).toBeInTheDocument();
  });
});
