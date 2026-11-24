import type { ReactNode } from "react";
import { DictionaryModal } from "@/shared/ui/DictionaryModal";
import { LoginModal } from "@/shared/ui/LoginModal";
import { WorkspaceSidebar } from "@/shared/ui/WorkspaceSidebar";
import { WorkspaceTopBar } from "@/shared/ui/WorkspaceTopBar";

export function WorkspaceShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <WorkspaceSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <WorkspaceTopBar />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
          {children}
        </main>
      </div>
      <DictionaryModal />
      <LoginModal />
    </div>
  );
}
