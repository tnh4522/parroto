import type { Metadata } from "next";
import { SpeakingLobbyView } from "@/features/speaking/components/SpeakingLobbyView";

export const metadata: Metadata = {
  title: "Community Speaking",
};

export default function SpeakingPage() {
  return <SpeakingLobbyView />;
}
