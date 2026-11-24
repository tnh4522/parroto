import { ExamSessionRunnerView } from "@/features/exams/components/ExamSessionRunnerView";
import { parseExamTrackOrNotFound } from "@/features/exams/lib/track";

export default async function ExamSessionPage({
  params,
}: {
  params: Promise<{ track: string; sessionId: string }>;
}) {
  const { track, sessionId } = await params;
  const resolvedTrack = parseExamTrackOrNotFound(track);
  return (
    <ExamSessionRunnerView
      track={resolvedTrack}
      sessionId={decodeURIComponent(sessionId)}
    />
  );
}
