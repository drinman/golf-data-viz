import { notFound } from "next/navigation";
import { decodeRound } from "@/lib/golf/share-codec";
import { getInterpolatedBenchmark, getBenchmarkMeta } from "@/lib/golf/benchmarks";
import { calculateStrokesGained, toRadarChartData } from "@/lib/golf/strokes-gained";
import { ShareCard } from "../_components/share-card";

export default async function ShareCardPreviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Gate: 404 in production to prevent accidental public exposure
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const params = await searchParams;
  const encoded = typeof params.d === "string" ? params.d : undefined;

  if (!encoded) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-100 p-8">
        <p className="text-neutral-500">Missing ?d= parameter</p>
      </main>
    );
  }

  const input = decodeRound(encoded);
  if (!input) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-100 p-8">
        <p className="text-neutral-500">Invalid ?d= parameter</p>
      </main>
    );
  }

  const benchmark = getInterpolatedBenchmark(input.handicapIndex);
  const result = calculateStrokesGained(input, benchmark);
  const chartData = toRadarChartData(result);
  const benchmarkMeta = getBenchmarkMeta();

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-100 p-8">
      <ShareCard
        result={result}
        chartData={chartData}
        courseName={input.course}
        score={input.score}
        benchmarkMeta={benchmarkMeta}
      />
    </main>
  );
}
