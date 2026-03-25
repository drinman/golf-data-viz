import { notFound } from "next/navigation";
import { LessonPrepBuilder } from "@/app/(tools)/strokes-gained/lesson-prep/_components/lesson-prep-builder";
import {
  previewBuilderEntitlements,
  previewBuilderRounds,
} from "@/app/_test-fixtures/lesson-prep";

export default function TestLessonPrepBuilderPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <LessonPrepBuilder
      rounds={previewBuilderRounds}
      entitlements={previewBuilderEntitlements}
      checkoutState={null}
    />
  );
}
