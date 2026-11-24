import type { Metadata } from "next";
import { VocabDeckDetailView } from "@/features/vocabulary/components/VocabDeckDetailView";

export const metadata: Metadata = {
  title: "Vocabulary Deck Detail",
};

export default async function VocabularyDeckPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <VocabDeckDetailView slug={decodeURIComponent(slug)} />;
}
