import type { Metadata } from "next";
import { decodeRound } from "@/lib/golf/share-codec";
import { getInterpolatedBenchmark } from "@/lib/golf/benchmarks";
import { calculateStrokesGained } from "@/lib/golf/strokes-gained";
import { findWeakestCategory } from "@/lib/golf/format";
import { derivePresentationTrust } from "@/lib/golf/presentation-trust";
import { buildRoundMetadataDescription } from "@/lib/golf/round-metadata";
import { getRoundSaveAvailability } from "@/lib/round-save";
import { getSampleResult } from "@/lib/golf/sample-round";
import StrokesGainedClient from "./_components/strokes-gained-client";

const PAGE_DESCRIPTION =
  "Free post-round strokes gained analysis from your scorecard stats. Compare yourself to handicap peers, not Tour pros.";

const DEFAULT_METADATA: Metadata = {
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
    return DEFAULT_METADATA;
  }

  // An uncaught throw in generateMetadata returns a 500 for the entire page.
  // The share codec already clamps handicap, but defense-in-depth for any edge case.
  let benchmark, sgResult;
  try {
    benchmark = getInterpolatedBenchmark(input.handicapIndex);
    sgResult = calculateStrokesGained(input, benchmark);
  } catch {
    return DEFAULT_METADATA;
  }

  const title = `Shot ${input.score} at ${input.course}`;
  const weakest = findWeakestCategory({
    sgOffTheTee: sgResult.categories["off-the-tee"],
    sgApproach: sgResult.categories["approach"],
    sgAroundTheGreen: sgResult.categories["around-the-green"],
    sgPutting: sgResult.categories["putting"],
  });
  const presentationTrust = derivePresentationTrust({ input, result: sgResult });
  const description = buildRoundMetadataDescription({
    handicapIndex: input.handicapIndex,
    greensInRegulation: input.greensInRegulation,
    totalPutts: input.totalPutts,
    weakestCategory: weakest,
    presentationTrustMode: presentationTrust?.mode,
  });

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
  const from = params.from === "history" ? ("history" as const) : undefined;
  const initialInput = payload ? decodeRound(payload) : null;
  const saveEnabled = getRoundSaveAvailability().enabled;

  // Parse handicap prefill from CTA links (?handicap=14.3)
  const handicapParam = typeof params.handicap === "string" ? params.handicap : undefined;
  const handicapPrefill = handicapParam ? parseFloat(handicapParam) : undefined;
  const validHandicapPrefill = handicapPrefill != null && !isNaN(handicapPrefill)
    && handicapPrefill >= -9.9 && handicapPrefill <= 54 ? handicapPrefill : undefined;

  const sample = getSampleResult();

  return (
    <StrokesGainedClient
      initialInput={initialInput}
      saveEnabled={saveEnabled}
      samplePreview={sample.preview}
      sampleInput={sample.input}
      from={from}
      handicapPrefill={validHandicapPrefill}
    />
  );
}
