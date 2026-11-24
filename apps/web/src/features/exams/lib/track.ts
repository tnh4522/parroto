import { notFound } from "next/navigation";
import type { ExamTrack } from "@linguacraft/contracts";

export function parseExamTrackOrNotFound(raw: string): ExamTrack {
  const upper = raw.toUpperCase();
  if (upper === "IELTS" || upper === "TOEIC") {
    return upper;
  }
  notFound();
}
