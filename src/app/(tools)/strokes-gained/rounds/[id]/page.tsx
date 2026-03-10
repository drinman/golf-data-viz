import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/auth";
import { getRoundDetail } from "@/lib/golf/round-queries";
import { formatHandicap } from "@/lib/golf/format";
import { RoundDetailClient } from "./_components/round-detail-client";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const user = await getUser();
  if (!user) return { title: "Round Detail" };

  const snapshot = await getRoundDetail(id, user.id);
  if (!snapshot) return { title: "Round Not Found" };

  const sgSign = snapshot.sgTotal >= 0 ? "+" : "";
  return {
    title: `${snapshot.courseName} — ${sgSign}${snapshot.sgTotal.toFixed(1)} SG`,
    description: `Shot ${snapshot.score} · ${formatHandicap(snapshot.handicapIndex)} HCP · Strokes Gained breakdown`,
    robots: { index: false, follow: false },
  };
}

export default async function RoundDetailPage({ params }: PageProps) {
  const { id } = await params;
  const user = await getUser();

  if (!user) {
    redirect("/strokes-gained/history");
  }

  const snapshot = await getRoundDetail(id, user.id);

  if (!snapshot) {
    notFound();
  }

  return <RoundDetailClient snapshot={snapshot} />;
}
