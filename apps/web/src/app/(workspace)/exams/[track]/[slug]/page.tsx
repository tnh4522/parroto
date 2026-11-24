import { ExamOverviewView } from "@/features/exams/components/ExamOverviewView";
import { parseExamTrackOrNotFound } from "@/features/exams/lib/track";

export default async function ExamOverviewPage({
  params,
}: {
  params: Promise<{ track: string; slug: string }>;
}) {
  const { track, slug } = await params;
  const resolvedTrack = parseExamTrackOrNotFound(track);
  return (
    <ExamOverviewView track={resolvedTrack} slug={decodeURIComponent(slug)} />
  );
}
