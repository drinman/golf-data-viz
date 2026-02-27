import type { Metadata } from "next";
import { decodeRound } from "@/lib/golf/share-codec";
import { getBracketForHandicap } from "@/lib/golf/benchmarks";
import { calculateStrokesGained } from "@/lib/golf/strokes-gained";
import type { StrokesGainedCategory } from "@/lib/golf/types";
import StrokesGainedClient from "./_components/strokes-gained-client";

const CATEGORY_LABELS: Record<StrokesGainedCategory, string> = {
  "off-the-tee": "Off the Tee",
  approach: "Approach",
  "around-the-green": "Around the Green",
  putting: "Putting",
};

function formatSG(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}`;
}

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({
  searchParams,
}: PageProps): Promise<Metadata> {
  const params = await searchParams;
  const payload = typeof params.d === "string" ? params.d : undefined;
  const input = payload ? decodeRound(payload) : null;

  if (!input) {
    return {
      title: "Strokes Gained Benchmarker",
      description:
        "See where you gain and lose strokes vs your handicap peers.",
    };
  }

  const benchmark = getBracketForHandicap(input.handicapIndex);
  const result = calculateStrokesGained(input, benchmark);

  const categoryHighlights = (
    Object.keys(CATEGORY_LABELS) as StrokesGainedCategory[]
  )
    .map((key) => `${CATEGORY_LABELS[key]} ${formatSG(result.categories[key])}`)
    .join(", ");

  const title = `SG Breakdown: ${formatSG(result.total)} total — ${input.course}`;
  const description = `Shot ${input.score} at ${input.course}. ${categoryHighlights}.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [`/strokes-gained/opengraph-image?d=${payload}`],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`/strokes-gained/opengraph-image?d=${payload}`],
    },
  };
}

export default async function StrokesGainedPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const payload = typeof params.d === "string" ? params.d : undefined;
  const initialInput = payload ? decodeRound(payload) : null;

  return <StrokesGainedClient initialInput={initialInput} />;
}
