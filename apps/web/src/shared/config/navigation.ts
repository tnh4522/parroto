import {
  BarChart3,
  BookOpen,
  FileCheck2,
  FolderKanban,
  Headphones,
  Home,
  Layers,
  Mic,
  MessageSquare,
  Settings,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

export interface NavLinkItem {
  href: string;
  label: string;
  icon: LucideIcon;
  group: "learning" | "community" | "account";
}

export const WORKSPACE_NAV_ITEMS: readonly NavLinkItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: Home, group: "learning" },
  { href: "/lessons", label: "Lesson Library", icon: FolderKanban, group: "learning" },
  { href: "/dictation", label: "Dictation", icon: Headphones, group: "learning" },
  { href: "/shadowing", label: "Shadowing", icon: Mic, group: "learning" },
  { href: "/vocabulary", label: "Vocabulary", icon: BookOpen, group: "learning" },
  { href: "/flashcards", label: "Flashcards (SRS)", icon: Layers, group: "learning" },
  { href: "/exams/ielts", label: "IELTS Exams", icon: FileCheck2, group: "learning" },
  { href: "/exams/toeic", label: "TOEIC Exams", icon: Sparkles, group: "learning" },
  { href: "/analytics", label: "Analytics", icon: BarChart3, group: "learning" },
  { href: "/speaking", label: "Community Speaking", icon: MessageSquare, group: "community" },
  { href: "/settings", label: "Settings", icon: Settings, group: "account" },
];
