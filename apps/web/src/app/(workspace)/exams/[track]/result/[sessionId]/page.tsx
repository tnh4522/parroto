import { ExamResultView } from "@/features/exams/components/ExamResultView";
import { parseExamTrackOrNotFound } from "@/features/exams/lib/track";

export default async function ExamResultPage({
  params,
}: {
  params: Promise<{ track: string; sessionId: string }>;
}) {
  const { track, sessionId } = await params;
  const resolvedTrack = parseExamTrackOrNotFound(track);
  return (
    <ExamResultView
      track={resolvedTrack}
      sessionId={decodeURIComponent(sessionId)}
    />
  );
}
