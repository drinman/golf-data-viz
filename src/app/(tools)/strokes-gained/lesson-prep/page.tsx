import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getUser } from "@/lib/supabase/auth";
import { getViewerEntitlements } from "@/lib/billing/entitlements";
import { getUserRounds } from "@/lib/golf/round-queries";
import { LessonPrepBuilder } from "./_components/lesson-prep-builder";

export const metadata: Metadata = {
  title: "Lesson Prep Report",
  description:
    "Build a premium lesson prep report from multiple saved rounds and share it with your coach.",
};

interface LessonPrepPageProps {
  searchParams: Promise<{ checkout?: string }>;
}

export default async function LessonPrepPage({ searchParams }: LessonPrepPageProps) {
  const user = await getUser();
  if (!user) {
    redirect("/strokes-gained/history");
  }

  const [rounds, entitlements, params] = await Promise.all([
    getUserRounds(user.id),
    getViewerEntitlements(user.id),
    searchParams,
  ]);

  const checkoutState =
    params.checkout === "success" || params.checkout === "cancelled"
      ? params.checkout
      : null;

  return (
    <LessonPrepBuilder
      rounds={rounds}
      entitlements={entitlements}
      checkoutState={checkoutState}
    />
  );
}
