import type { Metadata } from "next";
import { LessonLibraryView } from "@/features/lessons/components/LessonLibraryView";

export const metadata: Metadata = {
  title: "Dictation Lessons",
};

export default function DictationIndexPage() {
  return (
    <LessonLibraryView
      defaultMode="DICTATION"
      heading="Dictation Practice"
      subheading="Train intensive listening comprehension by transcribing spoken sentences."
    />
  );
}
