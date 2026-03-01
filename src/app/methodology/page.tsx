import type { Metadata } from "next";
import { getBenchmarkMeta, getBracketForHandicap } from "@/lib/golf/benchmarks";
import { calculateStrokesGained } from "@/lib/golf/strokes-gained";

export const metadata: Metadata = {
  title: "Methodology",
  description:
    "How the Strokes Gained Benchmarker works — formulas, data sources, and limitations.",
};

/** Sanity-check fixture rounds for the calibration table. */
const CALIBRATION_FIXTURES = [
  {
    label: "Scratch good round",
    input: {
      course: "Fixture",
      date: "2026-02-28",
      score: 73,
      handicapIndex: 2.0,
      courseRating: 72.0,
      slopeRating: 130,
      fairwaysHit: 10,
      fairwayAttempts: 14,
      greensInRegulation: 13,
      totalPutts: 30,
      penaltyStrokes: 0,
      eagles: 0,
      birdies: 3,
      pars: 12,
      bogeys: 3,
      doubleBogeys: 0,
      triplePlus: 0,
    },
    expected: "Positive (better than peers)",
  },
  {
    label: "10-HCP average",
    input: {
      course: "Fixture",
      date: "2026-02-28",
      score: 82,
      handicapIndex: 10.0,
      courseRating: 72.0,
      slopeRating: 130,
      fairwaysHit: 7,
      fairwayAttempts: 14,
      greensInRegulation: 7,
      totalPutts: 32,
      penaltyStrokes: 1,
      eagles: 0,
      birdies: 1,
      pars: 8,
      bogeys: 6,
      doubleBogeys: 2,
      triplePlus: 1,
    },
    expected: "~0 (near peer average)",
  },
  {
    label: "15-HCP bad round",
    input: {
      course: "Fixture",
      date: "2026-02-28",
      score: 98,
      handicapIndex: 15.0,
      courseRating: 72.0,
      slopeRating: 130,
      fairwaysHit: 3,
      fairwayAttempts: 14,
      greensInRegulation: 2,
      totalPutts: 36,
      penaltyStrokes: 4,
      eagles: 0,
      birdies: 0,
      pars: 3,
      bogeys: 6,
      doubleBogeys: 6,
      triplePlus: 3,
    },
    expected: "Negative (worse than peers)",
  },
  {
    label: "20-HCP typical",
    input: {
      course: "Fixture",
      date: "2026-02-28",
      score: 97,
      handicapIndex: 22.0,
      courseRating: 72.0,
      slopeRating: 130,
      fairwaysHit: 5,
      fairwayAttempts: 14,
      greensInRegulation: 4,
      totalPutts: 35,
      penaltyStrokes: 3,
      eagles: 0,
      birdies: 0,
      pars: 4,
      bogeys: 7,
      doubleBogeys: 5,
      triplePlus: 2,
    },
    expected: "~0 (near peer average)",
  },
  {
    label: "30+ HCP round",
    input: {
      course: "Fixture",
      date: "2026-02-28",
      score: 110,
      handicapIndex: 35.0,
      courseRating: 72.0,
      slopeRating: 130,
      fairwaysHit: 3,
      fairwayAttempts: 14,
      greensInRegulation: 1,
      totalPutts: 38,
      penaltyStrokes: 5,
      eagles: 0,
      birdies: 0,
      pars: 1,
      bogeys: 5,
      doubleBogeys: 6,
      triplePlus: 6,
    },
    expected: "Negative (worse than peers)",
  },
] as const;

function computeCalibrationRows() {
  return CALIBRATION_FIXTURES.map((fixture) => {
    const benchmark = getBracketForHandicap(fixture.input.handicapIndex);
    const result = calculateStrokesGained(fixture.input, benchmark);
    return {
      label: fixture.label,
      hcp: fixture.input.handicapIndex,
      score: fixture.input.score,
      expected: fixture.expected,
      actual: result.total,
    };
  });
}

export default function MethodologyPage() {
  const meta = getBenchmarkMeta();
  const calibrationRows = computeCalibrationRows();

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900">Methodology</h1>

      {/* Section 1: Not True SG */}
      <section className="mt-8">
        <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          True Strokes Gained requires shot-level start/end context (e.g., putt
          starting distances). This MVP is a proxy model that uses aggregate
          round statistics to estimate where you gain and lose strokes relative
          to your handicap peers.
        </p>
      </section>

      {/* Section 2: SG Formulas */}
      <section className="mt-10">
        <h2 className="text-xl font-semibold text-gray-900">
          SG Category Formulas
        </h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-300 text-left">
                <th className="pb-2 pr-4 font-medium text-gray-700">
                  Category
                </th>
                <th className="pb-2 pr-4 font-medium text-gray-700">
                  Formula
                </th>
                <th className="pb-2 font-medium text-gray-700">Weight</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="py-2 pr-4 font-medium text-gray-800">
                  Off the Tee
                </td>
                <td className="py-2 pr-4 font-mono text-xs text-gray-600">
                  (FIR% - peerFIR%) x 6.0 + (peerPenalties - penalties) x 0.8
                </td>
                <td className="py-2 text-gray-600">6.0, 0.8</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-medium text-gray-800">
                  Approach
                </td>
                <td className="py-2 pr-4 font-mono text-xs text-gray-600">
                  (GIR/18 - peerGIR%) x 8.0
                </td>
                <td className="py-2 text-gray-600">8.0</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-medium text-gray-800">
                  Around the Green
                </td>
                <td className="py-2 pr-4 font-mono text-xs text-gray-600">
                  (scrambleRate - peerScramble%) x 5.0
                </td>
                <td className="py-2 text-gray-600">5.0</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-medium text-gray-800">
                  Putting
                </td>
                <td className="py-2 pr-4 font-mono text-xs text-gray-600">
                  (peerPutts/18 - playerPutts/18) x 4.0 + clamp(threePuttBonus,
                  -0.5, 0.5)
                </td>
                <td className="py-2 text-gray-600">4.0</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Section 3: Metric-Level Citations */}
      <section className="mt-10">
        <h2 className="text-xl font-semibold text-gray-900">
          Data Sources &amp; Citations
        </h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-300 text-left">
                <th className="pb-2 pr-4 font-medium text-gray-700">Metric</th>
                <th className="pb-2 pr-4 font-medium text-gray-700">Source</th>
                <th className="pb-2 pr-4 font-medium text-gray-700">Date</th>
                <th className="pb-2 font-medium text-gray-700">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="py-2 pr-4 text-gray-800">averageScore</td>
                <td className="py-2 pr-4 text-gray-600">
                  USGA Handicap Research Report
                </td>
                <td className="py-2 pr-4 text-gray-600">2024</td>
                <td className="py-2 text-amber-600">Pending verification</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 text-gray-800">fairwayPercentage</td>
                <td className="py-2 pr-4 text-gray-600">
                  Shot Scope &quot;Average Golfer Stats&quot;
                </td>
                <td className="py-2 pr-4 text-gray-600">2024</td>
                <td className="py-2 text-amber-600">Pending verification</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 text-gray-800">girPercentage</td>
                <td className="py-2 pr-4 text-gray-600">
                  Shot Scope &quot;Average Golfer Stats&quot;
                </td>
                <td className="py-2 pr-4 text-gray-600">2024</td>
                <td className="py-2 text-amber-600">Pending verification</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 text-gray-800">puttsPerRound</td>
                <td className="py-2 pr-4 text-gray-600">
                  Arccos Putting Statistics
                </td>
                <td className="py-2 pr-4 text-gray-600">2023</td>
                <td className="py-2 text-amber-600">Pending verification</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 text-gray-800">
                  upAndDownPercentage
                </td>
                <td className="py-2 pr-4 text-gray-600">
                  Shot Scope Scrambling Stats
                </td>
                <td className="py-2 pr-4 text-gray-600">2024</td>
                <td className="py-2 text-amber-600">Pending verification</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 text-gray-800">penaltiesPerRound</td>
                <td className="py-2 pr-4 text-gray-600">
                  Lou Stagner / Arccos
                </td>
                <td className="py-2 pr-4 text-gray-600">2023</td>
                <td className="py-2 text-amber-600">Pending verification</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 text-gray-800">
                  scoring distribution
                </td>
                <td className="py-2 pr-4 text-gray-600">
                  Arccos Scoring Distribution
                </td>
                <td className="py-2 pr-4 text-gray-600">2023</td>
                <td className="py-2 text-amber-600">Pending verification</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Section 4: Assumptions & Limitations */}
      <section className="mt-10">
        <h2 className="text-xl font-semibold text-gray-900">
          Assumptions &amp; Limitations
        </h2>
        <ul className="mt-4 list-disc space-y-2 pl-6 text-sm text-gray-700">
          <li>
            <strong>Proxy model</strong> — not true SG Putting (requires putt
            starting distances)
          </li>
          <li>
            <strong>Composite averages</strong> — weighted composites from
            public reports, not a single sampled dataset
          </li>
          <li>
            <strong>Provisional</strong> — sample sizes per bracket not yet
            available
          </li>
          <li>
            <strong>Weights</strong> — heuristic starting values (6.0, 8.0, 5.0,
            4.0), subject to calibration
          </li>
        </ul>
      </section>

      {/* Section 5: Calibration */}
      <section className="mt-10">
        <h2 className="text-xl font-semibold text-gray-900">
          Calibration Sanity Check
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Weights are heuristic, pending calibration against a validation
          dataset. The table below shows computed SG totals for representative
          fixture rounds to verify directional correctness.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-300 text-left">
                <th className="pb-2 pr-4 font-medium text-gray-700">
                  Scenario
                </th>
                <th className="pb-2 pr-4 font-medium text-gray-700">HCP</th>
                <th className="pb-2 pr-4 font-medium text-gray-700">Score</th>
                <th className="pb-2 pr-4 font-medium text-gray-700">
                  Expected Direction
                </th>
                <th className="pb-2 font-medium text-gray-700">
                  Actual SG Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {calibrationRows.map((row) => (
                <tr key={row.label}>
                  <td className="py-2 pr-4 text-gray-800">{row.label}</td>
                  <td className="py-2 pr-4 text-gray-600">{row.hcp}</td>
                  <td className="py-2 pr-4 text-gray-600">{row.score}</td>
                  <td className="py-2 pr-4 text-gray-600">{row.expected}</td>
                  <td
                    className={`py-2 font-semibold ${
                      row.actual >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {row.actual >= 0 ? "+" : ""}
                    {row.actual.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Section 6: Changelog */}
      <section className="mt-10">
        <h2 className="text-xl font-semibold text-gray-900">Changelog</h2>
        <ul className="mt-4 list-disc space-y-1 pl-6 text-sm text-gray-700">
          <li>
            <strong>v0.1.0 (2026-02-28)</strong> — Initial seed data.
            Provisional. Sources: USGA, Arccos, Shot Scope, Stagner.
          </li>
        </ul>
      </section>

      {/* Reddit-ready footer */}
      <footer className="mt-12 border-t border-gray-200 pt-6">
        <p className="text-xs italic text-gray-400">
          Benchmarks v{meta.version} (updated {meta.updatedAt}), based on
          USGA/Arccos/Shot Scope/Stagner. This is an estimated SG proxy, not
          true shot-level Strokes Gained. Full methodology linked.
        </p>
      </footer>
    </main>
  );
}
