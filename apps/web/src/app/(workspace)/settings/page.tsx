import type { Metadata } from "next";
import { UserSettingsView } from "@/features/settings/components/UserSettingsView";

export const metadata: Metadata = {
  title: "Settings",
};

export default function SettingsPage() {
  return <UserSettingsView />;
}
