import type { Metadata } from "next";
import { getRoundByShareToken } from "@/lib/golf/round-queries";
import { formatHandicap } from "@/lib/golf/format";
import { SharedRoundClient } from "./_components/shared-round-client";

interface PageProps {
  params: Promise<{ token: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { token } = await params;
  const snapshot = await getRoundByShareToken(token);

  if (!snapshot) {
    return { title: "Round Not Found" };
  }

  const sgSign = snapshot.sgTotal >= 0 ? "+" : "";
  const title = `${snapshot.courseName} — ${sgSign}${snapshot.sgTotal.toFixed(1)} SG`;
  const description = `Shot ${snapshot.score} · ${formatHandicap(snapshot.handicapIndex)} HCP · Strokes Gained performance snapshot`;

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
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="font-display text-2xl text-neutral-950">
          Round Not Available
        </h1>
        <p className="mt-2 text-neutral-500">
          This shared round link is invalid or has been removed.
        </p>
      </main>
    );
  }

  return <SharedRoundClient snapshot={snapshot} />;
}
