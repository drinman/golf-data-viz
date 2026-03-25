import { notFound } from "next/navigation";
import { LessonReportView } from "@/app/(tools)/strokes-gained/lesson-prep/_components/lesson-report-view";
import {
  previewLessonReportSnapshot,
  previewReportEntitlements,
} from "@/app/_test-fixtures/lesson-prep";

export default function TestLessonReportPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <LessonReportView
      snapshot={previewLessonReportSnapshot}
      entitlements={previewReportEntitlements}
      surface="owner"
    />
  );
}
