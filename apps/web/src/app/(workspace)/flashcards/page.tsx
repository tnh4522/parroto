import type { Metadata } from "next";
import { FlashcardsView } from "@/features/flashcards/components/FlashcardsView";

export const metadata: Metadata = {
  title: "Flashcards",
};

export default async function FlashcardsPage({
  searchParams,
}: {
  searchParams: Promise<{ deck?: string }>;
}) {
  const { deck } = await searchParams;
  return <FlashcardsView deckSlug={deck} />;
}
