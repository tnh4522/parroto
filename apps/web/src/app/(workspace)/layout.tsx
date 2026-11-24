import type { ReactNode } from "react";
import { WorkspaceShell } from "@/shared/ui/WorkspaceShell";

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return <WorkspaceShell>{children}</WorkspaceShell>;
}
