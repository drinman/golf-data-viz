import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/auth";
import { getViewerEntitlements, requirePremium } from "@/lib/billing/entitlements";
import { formatSG } from "@/lib/golf/format";
import { getLessonReport } from "@/lib/golf/round-queries";
import { LessonReportView } from "../_components/lesson-report-view";

interface LessonPrepReportPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: LessonPrepReportPageProps): Promise<Metadata> {
  const user = await getUser();
  if (!user) return { title: "Lesson Prep Report" };

  const { id } = await params;
  const snapshot = await getLessonReport(id, user.id);
  if (!snapshot) return { title: "Lesson Prep Report" };

  return {
    title: `${snapshot.reportData.summary.roundCount} rounds · ${formatSG(
      snapshot.reportData.summary.averageSgTotal
    )} Avg Proxy SG`,
    description:
      "Multi-round lesson prep report with focus area, trend signal, and confidence framing.",
    robots: { index: false, follow: false },
  };
}

export default async function LessonPrepReportPage({
  params,
}: LessonPrepReportPageProps) {
  const user = await getUser();
  if (!user) {
    redirect("/strokes-gained/lesson-prep");
  }

  const { id } = await params;
  const [snapshot, entitlements] = await Promise.all([
    getLessonReport(id, user.id),
    getViewerEntitlements(user.id),
  ]);

  if (!snapshot) {
    notFound();
  }

  try {
    requirePremium(entitlements, "lesson_report_view");
  } catch {
    redirect("/strokes-gained/lesson-prep");
  }

  return (
    <LessonReportView
      snapshot={snapshot}
      entitlements={entitlements}
      surface="owner"
    />
  );
}
