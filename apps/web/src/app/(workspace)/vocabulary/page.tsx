import type { Metadata } from "next";
import { VocabularyLibraryView } from "@/features/vocabulary/components/VocabularyLibraryView";

export const metadata: Metadata = {
  title: "Vocabulary Decks",
};

export default function VocabularyPage() {
  return <VocabularyLibraryView />;
}
