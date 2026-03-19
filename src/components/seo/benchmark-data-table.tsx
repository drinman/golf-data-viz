import type { BracketBenchmark } from "@/lib/golf/types";

interface BenchmarkDataTableProps {
  benchmark: BracketBenchmark;
}

const METRICS: { label: string; key: keyof BracketBenchmark; format: (v: number) => string }[] = [
  { label: "Average Score", key: "averageScore", format: (v) => v.toFixed(1) },
  { label: "Fairway %", key: "fairwayPercentage", format: (v) => `${v.toFixed(1)}%` },
  { label: "GIR %", key: "girPercentage", format: (v) => `${v.toFixed(1)}%` },
  { label: "Putts / Round", key: "puttsPerRound", format: (v) => v.toFixed(1) },
  { label: "Up & Down %", key: "upAndDownPercentage", format: (v) => `${v.toFixed(1)}%` },
  { label: "Penalties / Round", key: "penaltiesPerRound", format: (v) => v.toFixed(1) },
];

export function BenchmarkDataTable({ benchmark }: BenchmarkDataTableProps) {
  return (
    <div data-testid="benchmark-data-table">
      <div className="overflow-x-auto rounded-lg border border-cream-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-cream-200 bg-cream-50 text-left">
              <th className="px-4 py-2.5 font-medium text-neutral-600">Metric</th>
              <th className="px-4 py-2.5 font-medium text-neutral-600">Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {METRICS.map(({ label, key, format }) => (
              <tr key={key}>
                <td className="px-4 py-2.5 text-neutral-800">{label}</td>
                <td className="px-4 py-2.5 font-mono text-neutral-600">
                  {format(benchmark[key] as number)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Scoring distribution */}
      <div className="mt-4 overflow-x-auto rounded-lg border border-cream-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-cream-200 bg-cream-50 text-left">
              <th className="px-4 py-2.5 font-medium text-neutral-600">Scoring</th>
              <th className="px-4 py-2.5 font-medium text-neutral-600">Per Round</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            <tr>
              <td className="px-4 py-2.5 text-neutral-800">Eagles</td>
              <td className="px-4 py-2.5 font-mono text-neutral-600">
                {benchmark.scoring.eaglesPerRound.toFixed(2)}
              </td>
            </tr>
            <tr>
              <td className="px-4 py-2.5 text-neutral-800">Birdies</td>
              <td className="px-4 py-2.5 font-mono text-neutral-600">
                {benchmark.scoring.birdiesPerRound.toFixed(2)}
              </td>
            </tr>
            <tr>
              <td className="px-4 py-2.5 text-neutral-800">Pars</td>
              <td className="px-4 py-2.5 font-mono text-neutral-600">
                {benchmark.scoring.parsPerRound.toFixed(2)}
              </td>
            </tr>
            <tr>
              <td className="px-4 py-2.5 text-neutral-800">Bogeys</td>
              <td className="px-4 py-2.5 font-mono text-neutral-600">
                {benchmark.scoring.bogeysPerRound.toFixed(2)}
              </td>
            </tr>
            <tr>
              <td className="px-4 py-2.5 text-neutral-800">Double Bogeys</td>
              <td className="px-4 py-2.5 font-mono text-neutral-600">
                {benchmark.scoring.doublesPerRound.toFixed(2)}
              </td>
            </tr>
            <tr>
              <td className="px-4 py-2.5 text-neutral-800">Triple+</td>
              <td className="px-4 py-2.5 font-mono text-neutral-600">
                {benchmark.scoring.triplePlusPerRound.toFixed(2)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
