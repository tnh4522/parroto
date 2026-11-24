import type { Metadata } from "next";
import { LessonLibraryView } from "@/features/lessons/components/LessonLibraryView";

export const metadata: Metadata = {
  title: "Lesson Library",
};

export default function LessonsPage() {
  return <LessonLibraryView />;
}
