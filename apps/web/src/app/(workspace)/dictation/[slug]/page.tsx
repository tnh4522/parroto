import type { Metadata } from "next";
import { DictationWorkspace } from "@/features/dictation/components/DictationWorkspace";

export const metadata: Metadata = {
  title: "Dictation Practice",
};

export default async function DictationLessonPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <DictationWorkspace slug={decodeURIComponent(slug)} />;
}
