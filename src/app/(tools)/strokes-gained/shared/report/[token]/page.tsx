import type { Metadata } from "next";
import { formatSG } from "@/lib/golf/format";
import { getLessonReportByShareToken } from "@/lib/golf/round-queries";
import { LessonReportView } from "@/app/(tools)/strokes-gained/lesson-prep/_components/lesson-report-view";

interface SharedLessonReportPageProps {
  params: Promise<{ token: string }>;
}

export async function generateMetadata({
  params,
}: SharedLessonReportPageProps): Promise<Metadata> {
  const { token } = await params;
  const snapshot = await getLessonReportByShareToken(token);

  if (!snapshot) {
    return { title: "Lesson Prep Report Not Found" };
  }

  const title = `${snapshot.reportData.summary.roundCount} rounds · ${formatSG(
    snapshot.reportData.summary.averageSgTotal
  )} Avg Proxy SG`;
  const description =
    "Read-only lesson prep report with focus area, trend signal, confidence, and methodology caveats.";

  return {
    title,
    description,
    robots: { index: false, follow: false },
    openGraph: {
      title,
      description,
      images: [`/strokes-gained/shared/report/${token}/og`],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`/strokes-gained/shared/report/${token}/og`],
    },
  };
}

export default async function SharedLessonReportPage({
  params,
}: SharedLessonReportPageProps) {
  const { token } = await params;
  const snapshot = await getLessonReportByShareToken(token);

  if (!snapshot) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="font-display text-2xl text-neutral-950">
          Lesson Prep Report Not Available
        </h1>
        <p className="mt-2 text-neutral-500">
          This shared report link is invalid or has been removed.
        </p>
      </main>
    );
  }

  return <LessonReportView snapshot={snapshot} surface="shared" />;
}
