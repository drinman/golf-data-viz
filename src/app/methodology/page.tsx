import type { Metadata } from "next";
import {
  getBenchmarkMeta,
  getInterpolatedBenchmark,
  getCitationStatus,
} from "@/lib/golf/benchmarks";
import { calculateStrokesGainedV3 } from "@/lib/golf/strokes-gained-v3";
import { CITATION_METRIC_KEYS } from "@/lib/golf/types";
import type { CitationMetricKey } from "@/lib/golf/types";
import {
  METHODOLOGY_VERSION_V3,
  CALIBRATION_VERSION,
  ATTRIBUTION_CORRECTION_VERSION,
} from "@/lib/golf/constants";

export const metadata: Metadata = {
  title: "Methodology",
  description:
    "How the Strokes Gained Benchmarker works — formulas, data sources, and limitations.",
  alternates: { canonical: "/methodology" },
};

/** Directional fixture rounds for the fixture check table. */
export const CALIBRATION_FIXTURES = [
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
      score: 84,
      handicapIndex: 10.0,
      courseRating: 72.0,
      slopeRating: 130,
      fairwaysHit: 7,
      fairwayAttempts: 14,
      greensInRegulation: 6,
      totalPutts: 33,
      penaltyStrokes: 1,
      eagles: 0,
      birdies: 0,
      pars: 7,
      bogeys: 7,
      doubleBogeys: 3,
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
      score: 115,
      handicapIndex: 35.0,
      courseRating: 72.0,
      slopeRating: 130,
      fairwaysHit: 2,
      fairwayAttempts: 14,
      greensInRegulation: 0,
      totalPutts: 40,
      penaltyStrokes: 6,
      eagles: 0,
      birdies: 0,
      pars: 0,
      bogeys: 4,
      doubleBogeys: 6,
      triplePlus: 8,
    },
    expected: "Negative (worse than peers)",
  },
] as const;

function computeCalibrationRows() {
  return CALIBRATION_FIXTURES.map((fixture) => {
    const benchmark = getInterpolatedBenchmark(fixture.input.handicapIndex);
    const result = calculateStrokesGainedV3(fixture.input, benchmark);
    return {
      label: fixture.label,
      hcp: fixture.input.handicapIndex,
      score: fixture.input.score,
      expected: fixture.expected,
      actual: result.total,
    };
  });
}

const TOC_ITEMS = [
  { id: "formulas", label: "SG Formulas" },
  { id: "total-anchor", label: "Total Anchor" },
  { id: "calibration", label: "Calibration" },
  { id: "reconciliation", label: "Reconciliation" },
  { id: "attribution-correction", label: "Attribution Correction" },
  { id: "data-sources", label: "Data Sources" },
  { id: "confidence", label: "Confidence Levels" },
  { id: "plus-handicaps", label: "Plus Handicaps" },
  { id: "ott-limitations", label: "OTT Limitations" },
  { id: "proxy-vs-shot-level", label: "Proxy vs Shot-Level" },
  { id: "assumptions", label: "Assumptions" },
  { id: "fixture-check", label: "Fixture Check" },
  { id: "changelog", label: "Changelog" },
];

const FORMULA_CARDS = [
  {
    category: "Off the Tee",
    formula: "(FIR% \u2212 peerFIR%) \u00D7 6.0 + (peerPenalties \u2212 penalties) \u00D7 0.8",
    weights: "6.0, 0.8",
  },
  {
    category: "Approach",
    formula: "(GIR/18 \u2212 peerGIR%) \u00D7 8.0",
    weights: "8.0",
  },
  {
    category: "Around the Green",
    formula: "(scrambleRate \u2212 peerScramble%) \u00D7 5.0",
    weights: "5.0",
  },
  {
    category: "Putting",
    formula: "(expectedPutts \u2212 actualPutts) / 18 \u00D7 4.0",
    weights: "4.0",
    note: "expectedPutts = GIR \u00D7 puttsPerGIR + (18 \u2212 GIR) \u00D7 puttsPerNonGIR. Falls back to (peerPutts/18 \u2212 playerPutts/18) when GIR is unavailable.",
  },
];

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
    <main>
      {/* ── Hero ── */}
      <div className="border-b border-cream-200 bg-cream-50">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
          <h1 className="font-display text-3xl tracking-tight text-neutral-950 sm:text-4xl">
            Methodology
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-neutral-600">
            Golf Data Viz is a free post-round benchmark that estimates
            proxy strokes gained from round-level scorecard stats, not
            shot-level tracking. This page explains the formulas, sources,
            confidence levels, and limitations.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <span className="rounded-full border border-brand-100 bg-white px-3 py-1 text-xs font-medium text-brand-800">
              Methodology v{METHODOLOGY_VERSION_V3}
            </span>
            <span className="rounded-full border border-brand-100 bg-white px-3 py-1 text-xs font-medium text-brand-800">
              Benchmarks v{meta.version}
            </span>
            <span className="rounded-full border border-brand-100 bg-white px-3 py-1 text-xs font-medium text-brand-800">
              Calibration {CALIBRATION_VERSION}
            </span>
            <span className="rounded-full border border-brand-100 bg-white px-3 py-1 text-xs font-medium text-brand-800">
              Attribution Correction {ATTRIBUTION_CORRECTION_VERSION}
            </span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-10">
        {/* Proxy model disclaimer */}
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-relaxed text-amber-900">
          True Strokes Gained requires shot-level start/end context (e.g., putt
          starting distances). This is a proxy model that uses aggregate
          round statistics to estimate where you gain and lose strokes relative
          to your handicap peers.
        </div>

        {/* ── Table of Contents ── */}
        <nav className="mt-8 rounded-lg border border-cream-200 bg-cream-50 px-5 py-4" aria-label="Table of contents">
          <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">
            On this page
          </p>
          <div className="mt-3 columns-2 gap-x-8 sm:columns-3">
            {TOC_ITEMS.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="block py-1 text-sm text-neutral-600 transition-colors hover:text-brand-800"
              >
                {item.label}
              </a>
            ))}
          </div>
        </nav>

        {/* ═══════════════════════════════════════════
            Pipeline: How It Works
            ═══════════════════════════════════════════ */}

        {/* ── SG Formulas ── */}
        <section id="formulas" className="mt-14 scroll-mt-8">
          <h2 className="font-display text-2xl tracking-tight text-neutral-950">
            Proxy SG Formulas
            <span className="ml-2 align-middle text-sm font-sans font-normal text-neutral-400">
              v{METHODOLOGY_VERSION_V3}
            </span>
          </h2>
          <p className="mt-2 text-base leading-relaxed text-neutral-600">
            These formulas reflect the current production methodology version.
            Coefficients may change in future releases as the model is recalibrated.
          </p>
          <div className="mt-6 space-y-3">
            {FORMULA_CARDS.map((card) => (
              <div
                key={card.category}
                className="rounded-lg border border-cream-200 bg-white px-5 py-4"
              >
                <div className="flex items-baseline justify-between gap-4">
                  <h3 className="font-display text-base text-neutral-950">
                    {card.category}
                  </h3>
                  <span className="shrink-0 rounded-full bg-brand-50 px-2.5 py-0.5 font-mono text-xs font-medium text-brand-800">
                    w: {card.weights}
                  </span>
                </div>
                <p className="mt-2 rounded-md bg-neutral-50 px-3 py-2 font-mono text-xs leading-relaxed text-neutral-600">
                  {card.formula}
                </p>
                {"note" in card && card.note && (
                  <p className="mt-2 text-xs italic text-neutral-500">
                    {card.note}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ── Total Anchor ── */}
        <section id="total-anchor" className="mt-14 scroll-mt-8">
          <h2 className="font-display text-2xl tracking-tight text-neutral-950">
            Total Anchor
          </h2>
          <p className="mt-2 text-base leading-relaxed text-neutral-600">
            Total Proxy SG is anchored to a peer expectation so that
            category values sum to a coherent total. Two modes exist:
          </p>
          <div className="mt-6 space-y-4">
            <div className="rounded-lg border border-brand-100 bg-brand-50 px-5 py-4">
              <p className="text-sm font-medium text-brand-800">
                Course-Adjusted (preferred)
              </p>
              <p className="mt-1 text-sm leading-relaxed text-neutral-600">
                When course rating and slope are available, total Proxy SG is
                anchored to a course-adjusted peer expectation:
              </p>
              <div className="mt-3 space-y-1 rounded-md bg-white/60 px-3 py-2">
                <p className="font-mono text-xs text-neutral-700">
                  peerExpectation = courseRating + (handicapIndex {'\u00D7'} slopeRating / 113)
                </p>
                <p className="font-mono text-xs text-neutral-700">
                  totalSG = peerExpectation {'\u2212'} actualScore
                </p>
              </div>
              <p className="mt-2 text-xs text-neutral-500">
                Based on the standard USGA expected score formula.
                Positive = played better than expected.
              </p>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-5 py-4">
              <p className="text-sm font-medium text-amber-800">
                Course-Neutral (fallback)
              </p>
              <p className="mt-1 text-sm leading-relaxed text-neutral-600">
                When course metadata is missing or invalid, the tool falls back
                to a course-neutral estimate and labels it accordingly:
              </p>
              <div className="mt-3 rounded-md bg-white/60 px-3 py-2">
                <p className="font-mono text-xs text-neutral-700">
                  totalSG = benchmark.averageScore {'\u2212'} actualScore
                </p>
              </div>
              <p className="mt-2 text-xs text-neutral-500">
                Course-neutral mode activates when course rating is 0 or slope
                is outside the valid 55{'\u2013'}155 range.
              </p>
            </div>
          </div>
        </section>

        {/* ── Calibration ── */}
        <section id="calibration" className="mt-14 scroll-mt-8">
          <h2 className="font-display text-2xl tracking-tight text-neutral-950">
            Calibration
          </h2>
          <p className="mt-2 text-base leading-relaxed text-neutral-600">
            Raw stat deltas (e.g., FIR% difference, GIR difference) are
            multiplied by calibrated coefficients to produce category SG
            values. Coefficients are versioned separately
            ({CALIBRATION_VERSION}) and may be updated independently of the
            methodology version.
          </p>
          <div className="mt-6 rounded-lg border border-cream-200 bg-cream-50 px-5 py-4 text-sm leading-relaxed text-neutral-600">
            <p className="font-medium text-neutral-800">
              Input paths
            </p>
            <p className="mt-1">
              Coefficients vary by the data available for each round:
            </p>
            <ul className="mt-3 list-disc space-y-1.5 pl-5">
              <li>
                <strong>Full</strong> — GIR provided and up-and-down data
                available (or no missed greens)
              </li>
              <li>
                <strong>GIR-estimated</strong> — GIR not provided by the user,
                estimated from scoring distribution
              </li>
              <li>
                <strong>ATG-fallback</strong> — GIR provided but no
                up-and-down data with missed greens
              </li>
            </ul>
            <div className="mt-4 overflow-x-auto rounded-md border border-neutral-200">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-50 text-left">
                    <th className="px-3 py-2 font-medium text-neutral-600">Profile</th>
                    <th className="px-3 py-2 font-medium text-neutral-600">OTT FIR</th>
                    <th className="px-3 py-2 font-medium text-neutral-600">OTT Pen</th>
                    <th className="px-3 py-2 font-medium text-neutral-600">Approach</th>
                    <th className="px-3 py-2 font-medium text-neutral-600">ATG</th>
                    <th className="px-3 py-2 font-medium text-neutral-600">Putting</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 font-mono">
                  <tr>
                    <td className="px-3 py-2 font-sans text-neutral-800">Full</td>
                    <td className="px-3 py-2 text-neutral-600">6.0</td>
                    <td className="px-3 py-2 text-neutral-600">0.8</td>
                    <td className="px-3 py-2 text-neutral-600">8.0</td>
                    <td className="px-3 py-2 text-neutral-600">5.0</td>
                    <td className="px-3 py-2 text-neutral-600">4.0</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-sans text-neutral-800">GIR-estimated</td>
                    <td className="px-3 py-2 text-neutral-600">6.0</td>
                    <td className="px-3 py-2 text-neutral-600">0.8</td>
                    <td className="px-3 py-2 text-neutral-600">6.5</td>
                    <td className="px-3 py-2 text-neutral-600">4.0</td>
                    <td className="px-3 py-2 text-neutral-600">4.0</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-sans text-neutral-800">ATG-fallback</td>
                    <td className="px-3 py-2 text-neutral-600">6.0</td>
                    <td className="px-3 py-2 text-neutral-600">0.8</td>
                    <td className="px-3 py-2 text-neutral-600">8.0</td>
                    <td className="px-3 py-2 text-neutral-600">3.5</td>
                    <td className="px-3 py-2 text-neutral-600">4.0</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-xs italic text-neutral-500">
              Coefficients are model artifacts, not hardcoded truths. The
              current seed coefficients ({CALIBRATION_VERSION}) are derived
              from heuristic analysis and will be empirically recalibrated
              as production data accumulates.
            </p>
          </div>
        </section>

        {/* ── Reconciliation ── */}
        <section id="reconciliation" className="mt-14 scroll-mt-8">
          <h2 className="font-display text-2xl tracking-tight text-neutral-950">
            Reconciliation
          </h2>
          <p className="mt-2 text-base leading-relaxed text-neutral-600">
            After calibration, per-category values may not sum exactly to the
            total anchor. Reconciliation scales categories so they sum to the
            anchor value.
          </p>
          <div className="mt-6 space-y-3 text-sm leading-relaxed text-neutral-600">
            <p>
              <strong className="text-neutral-800">Confidence-weighted scaling:</strong>{" "}
              Lower-confidence categories absorb more of the adjustment. A category rated
              &ldquo;Low&rdquo; confidence will shift more than one rated
              &ldquo;High.&rdquo;
            </p>
            <p>
              <strong className="text-neutral-800">Scale factor:</strong>{" "}
              The maximum proportional change applied to any category. A scale factor
              near 0 means strong alignment between the calibrated sum and the anchor.
              A factor above 0.5 triggers an &ldquo;excessive scaling&rdquo; flag.
            </p>
            <p>
              <strong className="text-neutral-800">Sign-flip prevention:</strong>{" "}
              If a reconciliation adjustment would reverse a category&apos;s sign
              (e.g., turning a positive into a negative), the category is clamped
              to zero instead. The excess amount is tracked as &ldquo;Other (not
              captured by scorecard stats)&rdquo; and shown on the results page
              when non-zero.
            </p>
            <p>
              <strong className="text-neutral-800">Signal breakdown:</strong>{" "}
              The info icon next to each category shows the raw signal value and
              reconciliation adjustment separately, so you can see how much of
              the final value came from your scorecard data vs. the reconciliation
              step.
            </p>
            <p className="text-xs italic text-neutral-500">
              Skipped categories (value = 0) are excluded from reconciliation.
              Final categories sum to the total anchor within {'\u00B1'}0.1.
            </p>
          </div>
        </section>

        {/* ── Attribution Correction ── */}
        <section id="attribution-correction" className="mt-14 scroll-mt-8">
          <h2 className="font-display text-2xl tracking-tight text-neutral-950">
            Attribution Correction
            <span className="ml-2 align-middle text-sm font-sans font-normal text-neutral-400">
              {ATTRIBUTION_CORRECTION_VERSION}
            </span>
          </h2>
          <p className="mt-2 text-base leading-relaxed text-neutral-600">
            Between calibration and reconciliation, an attribution
            correction layer detects divergence patterns between Off the Tee
            and Approach and redistributes a bounded amount of strokes between them.
          </p>
          <div className="mt-6 space-y-6">
            <div className="rounded-lg border border-cream-200 bg-white px-5 py-4 text-sm leading-relaxed text-neutral-600">
              <p className="font-medium text-neutral-800">Why</p>
              <p className="mt-1">
                In scorecard-based proxy models, some tee-shot value leaks into
                Approach when longer or more playable drives create shorter approach
                shots. A player with low FIR% but high GIR% may be under-credited
                on OTT and over-credited on Approach (or vice versa).
              </p>
            </div>
            <div className="rounded-lg border border-cream-200 bg-white px-5 py-4 text-sm leading-relaxed text-neutral-600">
              <p className="font-medium text-neutral-800">How</p>
              <p className="mt-1">
                The correction measures the divergence between a player&apos;s FIR%
                delta and GIR% delta versus their handicap peers. When the divergence
                exceeds a deadzone ({'\u00B1'}0.05), a bounded zero-sum adjustment
                shifts strokes between OTT and Approach.
              </p>
              <div className="mt-3 space-y-1 rounded-md bg-neutral-50 px-4 py-3">
                <p className="font-mono text-xs text-neutral-700">
                  divergence = (playerGIR% {'\u2212'} peerGIR%) {'\u2212'} (playerFIR% {'\u2212'} peerFIR%)
                </p>
                <p className="font-mono text-xs text-neutral-700">
                  correction = clamp(divergence {'\u00D7'} 0.6 {'\u00D7'} pathMultiplier {'\u00D7'} confidenceGate {'\u00D7'} shrinkage, {'\u2212'}0.5, +0.5)
                </p>
                <p className="font-mono text-xs text-neutral-700">
                  OTT += correction, Approach {'\u2212'}= correction
                </p>
              </div>
            </div>
            <div className="rounded-lg border border-cream-200 bg-white px-5 py-4 text-sm leading-relaxed text-neutral-600">
              <p className="font-medium text-neutral-800">Invariants</p>
              <ul className="mt-2 list-disc space-y-1.5 pl-5">
                <li>
                  <strong>Zero-sum</strong> — OTT adjustment + Approach adjustment = 0.
                  Putting and Around the Green are never modified.
                </li>
                <li>
                  <strong>Bounded</strong> — hard-capped at {'\u00B1'}0.5 strokes maximum
                  shift per round.
                </li>
                <li>
                  <strong>Confidence-gated</strong> — skipped entirely when FIR data
                  is missing (OTT confidence &ldquo;Low&rdquo;). Reduced by 50% when
                  GIR is estimated (Approach confidence &ldquo;Med&rdquo;).
                </li>
                <li>
                  <strong>Path-dependent</strong> — enabled for Full and GIR-estimated
                  input paths. Disabled for ATG-fallback.
                </li>
              </ul>
            </div>
            <p className="text-xs italic text-neutral-500">
              Divergence can be caused by driving distance, par mix, course setup,
              or round noise — not exclusively distance. This correction partially
              mitigates the attribution limitation but does not replace shot-level
              distance data.
            </p>
          </div>
        </section>

        {/* ── Group divider ── */}
        <hr className="my-16 border-neutral-100" />

        {/* ═══════════════════════════════════════════
            Data & Quality
            ═══════════════════════════════════════════ */}

        {/* ── Data Sources & Citations ── */}
        <section id="data-sources" className="scroll-mt-8" data-testid="citations-section">
          <h2 className="font-display text-2xl tracking-tight text-neutral-950">
            Data Sources &amp; Citations
          </h2>
          <p className="mt-2 text-base leading-relaxed text-neutral-600">
            All benchmark metrics used in the live Proxy SG calculation are
            source-locked and versioned.{" "}
            {coveredMetricCount} of {CITATION_METRIC_KEYS.length} tracked metrics
            have published-source coverage for some brackets.{" "}
            {unsourcedMetricCount > 0 && (
              <>{unsourcedMetricCount} remain unsourced.</>
            )}
          </p>
          <div className="mt-6 overflow-x-auto rounded-lg border border-cream-200">
            <table className="w-full text-sm" data-testid="citations-table">
              <thead>
                <tr className="border-b border-cream-200 bg-cream-50 text-left">
                  <th className="px-4 py-2.5 font-medium text-neutral-600">Metric</th>
                  <th className="px-4 py-2.5 font-medium text-neutral-600">Source</th>
                  <th className="px-4 py-2.5 font-medium text-neutral-600">Accessed</th>
                  <th className="px-4 py-2.5 font-medium text-neutral-600">Coverage</th>
                  <th className="px-4 py-2.5 font-medium text-neutral-600">Status</th>
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
                      <td className="px-4 py-2.5 text-neutral-800">{key}</td>
                      <td className="px-4 py-2.5 text-neutral-600">
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
                      <td className="px-4 py-2.5 text-neutral-600">
                        {entries.length > 0
                          ? entries.reduce((latest, c) =>
                              c.accessedDate > latest ? c.accessedDate : latest,
                            entries[0].accessedDate)
                          : "\u2014"}
                      </td>
                      <td className="px-4 py-2.5 text-neutral-600">
                        {bracketCount > 0
                          ? `${bracketCount}/7 brackets`
                          : "\u2014"}
                      </td>
                      <td className="px-4 py-2.5" data-testid={`citation-status-${key}`}>
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

        {/* ── Confidence Levels ── */}
        <section id="confidence" className="mt-14 scroll-mt-8">
          <h2 className="font-display text-2xl tracking-tight text-neutral-950">
            Confidence Levels
          </h2>
          <p className="mt-2 text-base leading-relaxed text-neutral-600">
            Confidence is assigned separately for each category based on the
            calculation path used for that category, not as an overall rating
            of the full round. Each category displays a confidence badge
            reflecting the quality of data available for that estimate.
          </p>
          <div className="mt-6 overflow-x-auto rounded-lg border border-cream-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-cream-200 bg-cream-50 text-left">
                  <th className="px-4 py-2.5 font-medium text-neutral-600">Level</th>
                  <th className="px-4 py-2.5 font-medium text-neutral-600">Meaning</th>
                  <th className="px-4 py-2.5 font-medium text-neutral-600">Category Examples</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                <tr>
                  <td className="px-4 py-2.5">
                    <span className="rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-medium uppercase text-data-positive">High</span>
                  </td>
                  <td className="px-4 py-2.5 text-neutral-600">Direct data provided by user</td>
                  <td className="px-4 py-2.5 text-neutral-600">Putting (total putts), Approach (GIR provided), ATG (up-and-down data)</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5">
                    <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium uppercase text-amber-700">Med</span>
                  </td>
                  <td className="px-4 py-2.5 text-neutral-600">Derived from related inputs</td>
                  <td className="px-4 py-2.5 text-neutral-600">OTT (FIR-only — no distance/miss quality), Approach (GIR estimated), ATG (from GIR + scoring)</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5">
                    <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium uppercase text-neutral-500">Low</span>
                  </td>
                  <td className="px-4 py-2.5 text-neutral-600">Limited data available</td>
                  <td className="px-4 py-2.5 text-neutral-600">OTT (penalties only), ATG (estimated from estimated GIR)</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-relaxed text-amber-900">
            <strong>Low-GIR putting caveat:</strong>{" "}
            When a player&apos;s GIR rate is more than 10 percentage points below
            their peer benchmark, the putting category displays a &ldquo;Low GIR
            — less reliable&rdquo; badge. With few greens hit in regulation, most
            putts come from scramble situations where expected putts differ
            significantly from GIR putts, reducing the reliability of the
            GIR-adjusted putting formula.
          </div>
        </section>

        {/* ── Plus Handicaps ── */}
        <section id="plus-handicaps" className="mt-14 scroll-mt-8">
          <h2 className="font-display text-2xl tracking-tight text-neutral-950">
            Plus Handicaps
          </h2>
          <p className="mt-2 text-base leading-relaxed text-neutral-600">
            Plus-handicap rounds are supported using extrapolated peer benchmarks
            below scratch. For category comparisons, we project the 0–5 handicap
            trend below 0 where the source data behaves sensibly. FIR% stays fixed
            at the scratch benchmark because the underlying benchmark data is
            non-monotonic, and GIR% is capped at 80% to avoid unrealistic elite
            values. Total strokes gained still uses the player&apos;s actual plus
            handicap in the course-adjusted calculation. This replaces the previous
            scratch-clamped approach, which could flatten category results and make
            it harder for plus-handicap players to see what to work on.
          </p>
        </section>

        {/* ── Group divider ── */}
        <hr className="my-16 border-neutral-100" />

        {/* ═══════════════════════════════════════════
            Context & Limitations
            ═══════════════════════════════════════════ */}

        {/* ── OTT Limitations ── */}
        <section id="ott-limitations" className="scroll-mt-8">
          <h2 className="font-display text-2xl tracking-tight text-neutral-950">
            Off the Tee Limitations
          </h2>
          <p className="mt-2 text-base leading-relaxed text-neutral-600">
            Off the Tee is primarily driven by fairway hit rate, without
            shot-level distance context, so it cannot distinguish a short straight
            drive from a long playable miss. It also does not capture miss
            direction, playable-vs-dead misses, or per-hole recovery context.
            Because of that, OTT is a medium-confidence category: a missed fairway
            can mean anything from &ldquo;still a great drive&rdquo; to &ldquo;hole
            effectively over.&rdquo; Our current attribution correction partially
            reduces obvious OTT/Approach cross-contamination, but higher-confidence
            OTT will require richer inputs such as distance and miss quality in a
            future phase.
          </p>
        </section>

        {/* ── Proxy SG vs Shot-Level SG ── */}
        <section id="proxy-vs-shot-level" className="mt-14 scroll-mt-8">
          <h2 className="font-display text-2xl tracking-tight text-neutral-950">
            Proxy SG vs Shot-Level SG
          </h2>
          <div className="mt-4 space-y-3 text-base leading-relaxed text-neutral-600">
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

        {/* ── Assumptions & Limitations ── */}
        <section id="assumptions" className="mt-14 scroll-mt-8">
          <h2 className="font-display text-2xl tracking-tight text-neutral-950">
            Assumptions &amp; Limitations
          </h2>
          <ul className="mt-4 list-disc space-y-3 pl-6 text-sm leading-relaxed text-neutral-600">
            <li>
              <strong className="text-neutral-800">Proxy model</strong> — not true SG Putting (requires putt
              starting distances)
            </li>
            <li>
              <strong className="text-neutral-800">Composite averages</strong> — weighted composites from
              public reports, not a single sampled dataset
            </li>
            <li>
              <strong className="text-neutral-800">Weights</strong> — seed coefficients ({CALIBRATION_VERSION})
              derived from heuristic analysis, subject to empirical
              recalibration as production data accumulates
            </li>
            <li>
              <strong className="text-neutral-800">OTT&rarr;Approach attribution</strong> — in scorecard-based
              proxy models, some tee-shot value can appear in Approach when longer
              or more playable drives create shorter approach shots. The attribution
              correction layer ({ATTRIBUTION_CORRECTION_VERSION}) partially
              mitigates this using FIR/GIR divergence patterns, but full correction
              requires shot-level distance and lie data.
            </li>
            <li>
              <strong className="text-neutral-800">Scoring distribution</strong> — scoring-derived logic is
              used only in specific fallback paths where direct inputs are
              unavailable
            </li>
          </ul>
        </section>

        {/* ── Group divider ── */}
        <hr className="my-16 border-neutral-100" />

        {/* ═══════════════════════════════════════════
            Validation
            ═══════════════════════════════════════════ */}

        {/* ── Directional Fixture Check ── */}
        <section id="fixture-check" className="scroll-mt-8">
          <h2 className="font-display text-2xl tracking-tight text-neutral-950">
            Directional Fixture Check
          </h2>
          <p className="mt-2 text-base leading-relaxed text-neutral-600">
            These examples validate that the model behaves sensibly. They are not
            proof of perfect calibration and should not be interpreted as reference
            benchmarks for all rounds.
          </p>
          <div className="mt-6 overflow-x-auto rounded-lg border border-cream-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-cream-200 bg-cream-50 text-left">
                  <th className="px-4 py-2.5 font-medium text-neutral-600">Scenario</th>
                  <th className="px-4 py-2.5 font-medium text-neutral-600">HCP</th>
                  <th className="px-4 py-2.5 font-medium text-neutral-600">Score</th>
                  <th className="px-4 py-2.5 font-medium text-neutral-600">Expected Direction</th>
                  <th className="px-4 py-2.5 font-medium text-neutral-600">Actual SG Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {calibrationRows.map((row) => (
                  <tr key={row.label}>
                    <td className="px-4 py-2.5 text-neutral-800">{row.label}</td>
                    <td className="px-4 py-2.5 text-neutral-600">{row.hcp}</td>
                    <td className="px-4 py-2.5 text-neutral-600">{row.score}</td>
                    <td className="px-4 py-2.5 text-neutral-600">{row.expected}</td>
                    <td
                      className={`px-4 py-2.5 font-semibold ${
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

        {/* ── Changelog ── */}
        <section id="changelog" className="mt-14 scroll-mt-8" data-testid="changelog-section">
          <h2 className="font-display text-2xl tracking-tight text-neutral-950">Changelog</h2>
          <ul className="mt-4 list-disc space-y-1.5 pl-6 text-sm leading-relaxed text-neutral-600">
            {meta.changelog.map((entry) => (
              <li key={entry.version}>
                <strong className="text-neutral-800">
                  v{entry.version} ({entry.date})
                </strong>{" "}
                — {entry.summary}
              </li>
            ))}
          </ul>
        </section>

        {/* ── Footer ── */}
        <footer className="mt-16 border-t border-neutral-200 pt-6 pb-8">
          <p className="text-xs italic leading-relaxed text-neutral-400">
            Benchmarks v{meta.version} (updated {meta.updatedAt}) use a
            version-locked canonical benchmark source for all production values.
            The broader methodology is informed by public handicapping and
            strokes-gained research, but benchmark values are sourced and
            versioned independently. Methodology v{METHODOLOGY_VERSION_V3},
            Calibration {CALIBRATION_VERSION},
            Attribution Correction {ATTRIBUTION_CORRECTION_VERSION}.
            This is a peer-compared SG proxy, not true shot-level Strokes Gained.
          </p>
        </footer>
      </div>
    </main>
  );
}
