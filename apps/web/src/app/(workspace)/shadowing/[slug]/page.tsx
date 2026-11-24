import type { Metadata } from "next";
import { ShadowingWorkspace } from "@/features/shadowing/components/ShadowingWorkspace";

export const metadata: Metadata = {
  title: "Shadowing Practice",
};

export default async function ShadowingLessonPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <ShadowingWorkspace slug={decodeURIComponent(slug)} />;
}
