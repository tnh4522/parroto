import { ExamSetDetailView } from "@/features/exams/components/ExamSetDetailView";
import { parseExamTrackOrNotFound } from "@/features/exams/lib/track";

export default async function ExamSetDetailPage({
  params,
}: {
  params: Promise<{ track: string; setSlug: string }>;
}) {
  const { track, setSlug } = await params;
  const resolvedTrack = parseExamTrackOrNotFound(track);
  return (
    <ExamSetDetailView
      track={resolvedTrack}
      setSlug={decodeURIComponent(setSlug)}
    />
  );
}
