import type { Metadata } from "next";
import {
  getBenchmarkMeta,
  getInterpolatedBenchmark,
  getCitationStatus,
} from "@/lib/golf/benchmarks";
import { calculateStrokesGained } from "@/lib/golf/strokes-gained";
import { CITATION_METRIC_KEYS } from "@/lib/golf/types";
import type { CitationMetricKey } from "@/lib/golf/types";

export const metadata: Metadata = {
  title: "Methodology",
  description:
    "How the Strokes Gained Benchmarker works — formulas, data sources, and limitations.",
  alternates: { canonical: "/methodology" },
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
    const benchmark = getInterpolatedBenchmark(fixture.input.handicapIndex);
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
  const citationStatuses = CITATION_METRIC_KEYS.map((key) =>
    getCitationStatus(meta.citations[key as CitationMetricKey])
  );
  const coveredMetricCount = citationStatuses.filter(
    (status) => status === "partial" || status === "sourced"
  ).length;
  const unsourcedMetricCount = citationStatuses.filter(
    (status) => status === "pending"
  ).length;

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-display text-3xl tracking-tight text-neutral-950">Methodology</h1>
      <p className="mt-2 max-w-2xl text-sm text-neutral-600">
        Golf Data Viz is a free post-round benchmark that estimates
        proxy strokes gained from round-level scorecard stats, not
        shot-level tracking. This page explains the formulas, sources,
        confidence levels, and limitations.
      </p>

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
        <h2 className="font-display text-xl tracking-tight text-neutral-950">
          SG Category Formulas
        </h2>
        <div className="mt-4 overflow-x-auto -mx-4 px-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left">
                <th className="pb-2 pr-4 font-medium text-neutral-600">
                  Category
                </th>
                <th className="pb-2 pr-4 font-medium text-neutral-600 whitespace-nowrap">
                  Formula
                </th>
                <th className="pb-2 font-medium text-neutral-600">Weight</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              <tr>
                <td className="py-2 pr-4 font-medium text-neutral-800">
                  Off the Tee
                </td>
                <td className="py-2 pr-4 font-mono text-xs text-neutral-600 whitespace-nowrap">
                  (FIR% - peerFIR%) x 6.0 + (peerPenalties - penalties) x 0.8
                </td>
                <td className="py-2 font-mono text-neutral-600">6.0, 0.8</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-medium text-neutral-800">
                  Approach
                </td>
                <td className="py-2 pr-4 font-mono text-xs text-neutral-600 whitespace-nowrap">
                  (GIR/18 - peerGIR%) x 8.0
                </td>
                <td className="py-2 font-mono text-neutral-600">8.0</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-medium text-neutral-800">
                  Around the Green
                </td>
                <td className="py-2 pr-4 font-mono text-xs text-neutral-600 whitespace-nowrap">
                  (scrambleRate - peerScramble%) x 5.0
                </td>
                <td className="py-2 font-mono text-neutral-600">5.0</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-medium text-neutral-800">
                  Putting
                </td>
                <td className="py-2 pr-4 font-mono text-xs text-neutral-600 whitespace-nowrap">
                  (peerPutts/18 - playerPutts/18) x 4.0
                </td>
                <td className="py-2 font-mono text-neutral-600">4.0</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Section 3: Metric-Level Citations (dynamic from JSON) */}
      <section className="mt-10" data-testid="citations-section">
        <h2 className="font-display text-xl tracking-tight text-neutral-950">
          Data Sources &amp; Citations
        </h2>
        <p className="mt-2 text-sm text-neutral-600">
          {coveredMetricCount} of {CITATION_METRIC_KEYS.length} tracked metrics
          {" "}have published-source coverage for some brackets.{" "}
          {unsourcedMetricCount} remain unsourced, and the benchmark is still
          provisional.
        </p>
        <div className="mt-4 overflow-x-auto -mx-4 px-4">
          <table className="w-full text-sm" data-testid="citations-table">
            <thead>
              <tr className="border-b border-neutral-200 text-left">
                <th className="pb-2 pr-4 font-medium text-neutral-600">Metric</th>
                <th className="pb-2 pr-4 font-medium text-neutral-600">Source</th>
                <th className="pb-2 pr-4 font-medium text-neutral-600">
                  Accessed
                </th>
                <th className="pb-2 pr-4 font-medium text-neutral-600">
                  Coverage
                </th>
                <th className="pb-2 font-medium text-neutral-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {CITATION_METRIC_KEYS.map((key) => {
                const entries = meta.citations[key as CitationMetricKey];
                const status = getCitationStatus(entries);
                const bracketCount = new Set(
                  entries.flatMap((c) => c.coveredBrackets)
                ).size;

                return (
                  <tr key={key} data-testid={`citation-row-${key}`}>
                    <td className="py-2 pr-4 text-neutral-800">{key}</td>
                    <td className="py-2 pr-4 text-neutral-600">
                      {entries.length === 0 ? (
                        <span className="italic text-neutral-400">None</span>
                      ) : (
                        entries.map((c, i) => (
                          <span key={i} className={i > 0 ? "mt-1 block" : ""}>
                            {c.url ? (
                              <a
                                href={c.url}
                                className="text-brand-800 underline"
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                {c.source}
                              </a>
                            ) : (
                              c.source
                            )}
                          </span>
                        ))
                      )}
                    </td>
                    <td className="py-2 pr-4 text-neutral-600">
                      {entries.length > 0
                        ? entries.reduce((latest, c) =>
                            c.accessedDate > latest ? c.accessedDate : latest,
                          entries[0].accessedDate)
                        : "\u2014"}
                    </td>
                    <td className="py-2 pr-4 text-neutral-600">
                      {bracketCount > 0
                        ? `${bracketCount}/7 brackets`
                        : "\u2014"}
                    </td>
                    <td className="py-2" data-testid={`citation-status-${key}`}>
                      {status === "sourced" && (
                        <span className="text-data-positive">Sourced</span>
                      )}
                      {status === "partial" && (
                        <span className="text-amber-700">Partial</span>
                      )}
                      {status === "pending" && (
                        <span className="text-neutral-400">Pending</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Section 4: Assumptions & Limitations */}
      <section className="mt-10">
        <h2 className="font-display text-xl tracking-tight text-neutral-950">
          Assumptions &amp; Limitations
        </h2>
        <ul className="mt-4 list-disc space-y-2 pl-6 text-sm text-neutral-600">
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

      {/* Section 5: Proxy SG vs Shot-Level SG */}
      <section className="mt-10">
        <h2 className="font-display text-xl tracking-tight text-neutral-950">
          Proxy SG vs Shot-Level SG
        </h2>
        <div className="mt-4 space-y-3 text-sm text-neutral-600">
          <p>
            True strokes gained (as used by the PGA Tour) measures each shot&apos;s
            start and end position against expected strokes from that location.
            This requires GPS or shot-tracking hardware.
          </p>
          <p>
            Proxy SG estimates category-level performance from aggregate round
            stats (fairways hit, GIR, putts, penalties, scoring distribution).
            It answers &ldquo;where am I gaining/losing relative to my handicap
            peers?&rdquo; without shot-level data.
          </p>
          <p>
            Proxy SG is directionally useful for practice prioritization but
            cannot capture within-category nuance (e.g., putt starting
            distances, approach miss direction, driving distance).
          </p>
        </div>
      </section>

      {/* Section 6: Confidence Levels */}
      <section className="mt-10">
        <h2 className="font-display text-xl tracking-tight text-neutral-950">
          Confidence Levels
        </h2>
        <p className="mt-2 text-sm text-neutral-600">
          Each category displays a confidence badge reflecting the quality of data
          available for that estimate.
        </p>
        <div className="mt-4 overflow-x-auto -mx-4 px-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left">
                <th className="pb-2 pr-4 font-medium text-neutral-600">Level</th>
                <th className="pb-2 pr-4 font-medium text-neutral-600">Meaning</th>
                <th className="pb-2 font-medium text-neutral-600">Category Examples</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              <tr>
                <td className="py-2 pr-4">
                  <span className="rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-medium uppercase text-data-positive">High</span>
                </td>
                <td className="py-2 pr-4 text-neutral-600">Direct data provided by user</td>
                <td className="py-2 text-neutral-600">Putting (total putts), Approach (GIR provided), ATG (up-and-down data)</td>
              </tr>
              <tr>
                <td className="py-2 pr-4">
                  <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium uppercase text-amber-700">Med</span>
                </td>
                <td className="py-2 pr-4 text-neutral-600">Derived from related inputs</td>
                <td className="py-2 text-neutral-600">OTT (FIR-only — no distance/miss quality), Approach (GIR estimated), ATG (from GIR + scoring)</td>
              </tr>
              <tr>
                <td className="py-2 pr-4">
                  <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium uppercase text-neutral-500">Low</span>
                </td>
                <td className="py-2 pr-4 text-neutral-600">Limited data available</td>
                <td className="py-2 text-neutral-600">OTT (penalties only), ATG (estimated from estimated GIR)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Section 7: OTT Limitations */}
      <section className="mt-10">
        <h2 className="font-display text-xl tracking-tight text-neutral-950">
          Off the Tee Limitations
        </h2>
        <p className="mt-2 text-sm text-neutral-600">
          Off the Tee uses fairway accuracy and penalty data only. It does not
          measure driving distance, miss direction, or recovery difficulty.
          FIR-only OTT is rated Medium confidence because it cannot distinguish
          &ldquo;missed fairway but great drive&rdquo; from &ldquo;missed fairway
          and dead.&rdquo; Higher confidence OTT will require richer inputs
          (distance, playable miss) in a future phase.
        </p>
      </section>

      {/* Section 8: Calibration */}
      <section className="mt-10">
        <h2 className="font-display text-xl tracking-tight text-neutral-950">
          Calibration Sanity Check
        </h2>
        <p className="mt-2 text-sm text-neutral-600">
          Weights are heuristic, pending calibration against a validation
          dataset. The table below shows computed SG totals for representative
          fixture rounds to verify directional correctness.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left">
                <th className="pb-2 pr-4 font-medium text-neutral-600">
                  Scenario
                </th>
                <th className="pb-2 pr-4 font-medium text-neutral-600">HCP</th>
                <th className="pb-2 pr-4 font-medium text-neutral-600">Score</th>
                <th className="pb-2 pr-4 font-medium text-neutral-600">
                  Expected Direction
                </th>
                <th className="pb-2 font-medium text-neutral-600">
                  Actual SG Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {calibrationRows.map((row) => (
                <tr key={row.label}>
                  <td className="py-2 pr-4 text-neutral-800">{row.label}</td>
                  <td className="py-2 pr-4 text-neutral-600">{row.hcp}</td>
                  <td className="py-2 pr-4 text-neutral-600">{row.score}</td>
                  <td className="py-2 pr-4 text-neutral-600">{row.expected}</td>
                  <td
                    className={`py-2 font-semibold ${
                      row.actual >= 0 ? "text-data-positive" : "text-data-negative"
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

      {/* Section 6: Changelog (dynamic from JSON) */}
      <section className="mt-10" data-testid="changelog-section">
        <h2 className="font-display text-xl tracking-tight text-neutral-950">Changelog</h2>
        <ul className="mt-4 list-disc space-y-1 pl-6 text-sm text-neutral-600">
          {meta.changelog.map((entry) => (
            <li key={entry.version}>
              <strong>
                v{entry.version} ({entry.date})
              </strong>{" "}
              — {entry.summary}
            </li>
          ))}
        </ul>
      </section>

      {/* Reddit-ready footer */}
      <footer className="mt-12 border-t border-neutral-200 pt-6">
        <p className="text-xs italic text-neutral-400">
          Benchmarks v{meta.version} (updated {meta.updatedAt}), based on
          USGA/Arccos/Shot Scope/Stagner. This is a peer-compared SG proxy, not
          true shot-level Strokes Gained. Full methodology linked.
        </p>
      </footer>
    </main>
  );
}
