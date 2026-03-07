import type { Metadata } from "next";
import { decodeRound } from "@/lib/golf/share-codec";
import { getInterpolatedBenchmark } from "@/lib/golf/benchmarks";
import { calculateStrokesGained } from "@/lib/golf/strokes-gained";
import type { StrokesGainedCategory } from "@/lib/golf/types";
import { CATEGORY_LABELS } from "@/lib/golf/constants";
import { getRoundSaveAvailability } from "@/lib/round-save";
import { getSampleResult } from "@/lib/golf/sample-round";
import StrokesGainedClient from "./_components/strokes-gained-client";

const PAGE_DESCRIPTION =
  "Free post-round proxy strokes gained from manual scorecard stats. Compare yourself to handicap peers, not Tour pros.";

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
      description: PAGE_DESCRIPTION,
      alternates: { canonical: "/strokes-gained" },
      openGraph: {
        title: "Strokes Gained Benchmarker",
        description: PAGE_DESCRIPTION,
        url: "/strokes-gained",
      },
      twitter: {
        card: "summary_large_image",
        title: "Strokes Gained Benchmarker",
        description: PAGE_DESCRIPTION,
      },
    };
  }

  const benchmark = getInterpolatedBenchmark(input.handicapIndex);
  const result = calculateStrokesGained(input, benchmark);

  const skippedSet = new Set(result.skippedCategories);
  const estimatedSet = new Set(result.estimatedCategories);
  const categoryHighlights = (
    Object.keys(CATEGORY_LABELS) as StrokesGainedCategory[]
  )
    .filter((key) => !skippedSet.has(key))
    .map((key) => {
      const label = CATEGORY_LABELS[key];
      const value = formatSG(result.categories[key]);
      return estimatedSet.has(key) ? `${label} ${value} (est.)` : `${label} ${value}`;
    })
    .join(", ");

  const title = `SG Breakdown: ${formatSG(result.total)} total — ${input.course}`;
  const description = categoryHighlights
    ? `Shot ${input.score} at ${input.course}. ${categoryHighlights}.`
    : `Shot ${input.score} at ${input.course}.`;

  return {
    title,
    description,
    alternates: {
      canonical: "/strokes-gained",
    },
    robots: {
      index: false,
      follow: false,
    },
    openGraph: {
      title,
      description,
      images: [`/strokes-gained/og?d=${payload}`],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`/strokes-gained/og?d=${payload}`],
    },
  };
}

export default async function StrokesGainedPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const payload = typeof params.d === "string" ? params.d : undefined;
  const initialInput = payload ? decodeRound(payload) : null;
  const saveEnabled = getRoundSaveAvailability().enabled;
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? null;

  const sample = getSampleResult();

  return (
    <StrokesGainedClient
      initialInput={initialInput}
      saveEnabled={saveEnabled}
      turnstileSiteKey={turnstileSiteKey}
      samplePreview={sample.preview}
    />
  );
}
