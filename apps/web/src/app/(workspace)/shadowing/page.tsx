import type { Metadata } from "next";
import { LessonLibraryView } from "@/features/lessons/components/LessonLibraryView";

export const metadata: Metadata = {
  title: "Shadowing Lessons",
};

export default function ShadowingIndexPage() {
  return (
    <LessonLibraryView
      defaultMode="SHADOWING"
      heading="Shadowing Practice"
      subheading="Imitate native cadence and review word-by-word transcript alignment with IPA reference."
    />
  );
}
