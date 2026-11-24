import { ExamTrackLandingView } from "@/features/exams/components/ExamTrackLandingView";
import { parseExamTrackOrNotFound } from "@/features/exams/lib/track";

export default async function ExamTrackPage({
  params,
}: {
  params: Promise<{ track: string }>;
}) {
  const { track } = await params;
  const resolvedTrack = parseExamTrackOrNotFound(track);
  return <ExamTrackLandingView track={resolvedTrack} />;
}
