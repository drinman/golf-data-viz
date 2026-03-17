import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getRoundByShareToken } from "@/lib/golf/round-queries";
import { formatHandicap, findWeakestCategory } from "@/lib/golf/format";
import { SharedRoundClient } from "./_components/shared-round-client";

interface PageProps {
  params: Promise<{ token: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { token } = await params;
  const snapshot = await getRoundByShareToken(token);

  if (!snapshot) {
    return { title: "Round Not Found", robots: { index: false, follow: false } };
  }

  const title = `Shot ${snapshot.score} at ${snapshot.courseName}`;
  const descParts: string[] = [`${formatHandicap(snapshot.handicapIndex)} index`];
  if (snapshot.greensInRegulation != null) descParts.push(`${snapshot.greensInRegulation} GIR`);
  if (snapshot.totalPutts != null) descParts.push(`${snapshot.totalPutts} putts`);
  const weakest = findWeakestCategory(snapshot);
  if (weakest) descParts.push(`Lost most strokes on ${weakest}`);
  const description = descParts.join(" · ");

  return {
    title,
    description,
    robots: { index: false, follow: false },
    openGraph: {
      title,
      description,
      images: [`/strokes-gained/shared/round/${token}/og`],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`/strokes-gained/shared/round/${token}/og`],
    },
  };
}

export default async function SharedRoundPage({ params }: PageProps) {
  const { token } = await params;
  const snapshot = await getRoundByShareToken(token);

  if (!snapshot) {
    notFound();
  }

  return <SharedRoundClient snapshot={snapshot} />;
}
