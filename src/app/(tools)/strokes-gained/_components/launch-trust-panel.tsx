"use client";

import Link from "next/link";

const GITHUB_REPO_URL = "https://github.com/drinman/golf-data-viz";

interface LaunchTrustPanelProps {
  defaultCollapsed?: boolean;
}

export function LaunchTrustPanel({ defaultCollapsed = false }: LaunchTrustPanelProps) {
  const content = (
    <>
      <ul className="space-y-2">
        <li>
          <strong className="text-neutral-950">Beta</strong>
          {" "}
          Benchmarks are provisional, and the methodology and sources are
          published.
        </li>
        <li>
          <strong className="text-neutral-950">Scorecard Strokes Gained</strong>
          {" "}
          Strokes gained from the stats you already track, compared to golfers
          at your handicap level.
        </li>
        <li>
          <strong className="text-neutral-950">Private</strong>
          {" "}
          No account required. Saving is opt-in and anonymous.
        </li>
        <li>
          <strong className="text-neutral-950">Open</strong>
          {" "}
          <Link href="/methodology" className="text-brand-800 underline transition-colors hover:text-brand-700">
            Methodology
          </Link>
          {", "}
          <Link href="/privacy" className="text-brand-800 underline transition-colors hover:text-brand-700">
            Privacy
          </Link>
          {", and "}
          <a
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-800 underline transition-colors hover:text-brand-700"
          >
            GitHub
          </a>
          {" "}cover the formulas, data sources, and code.
        </li>
      </ul>

      <details className="mt-4 rounded-lg border border-cream-200 bg-white px-3 py-2">
        <summary className="cursor-pointer rounded font-medium text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-800/30">
          Common questions
        </summary>
        <dl className="mt-3 space-y-3 text-sm text-neutral-600">
          <div>
            <dt className="font-medium text-neutral-950">
              Why use this instead of 18Birdies, TheGrint, or GHIN?
            </dt>
            <dd className="mt-1">
              Those track scores and round stats. This benchmarks where you
              gained or lost strokes versus golfers at your handicap.
            </dd>
          </div>
          <div>
            <dt className="font-medium text-neutral-950">
              Why use this if I have Arccos?
            </dt>
            <dd className="mt-1">
              Arccos and Shot Scope are better for shot-level tracking. This is
              for quick post-round benchmarking from scorecard stats.
            </dd>
          </div>
          <div>
            <dt className="font-medium text-neutral-950">
              Is this true strokes gained?
            </dt>
            <dd className="mt-1">
              It uses scorecard-level stats, not shot-by-shot tracking. The
              methodology page explains the approach and tradeoffs.
            </dd>
          </div>
          <div>
            <dt className="font-medium text-neutral-950">
              Are you storing my data?
            </dt>
            <dd className="mt-1">
              Only if you opt in to save a round. Shared links contain the round
              stats needed to recreate the chart, so only share them if you are
              comfortable sharing those stats.
            </dd>
          </div>
          <div>
            <dt className="font-medium text-neutral-950">
              What do the confidence badges mean?
            </dt>
            <dd className="mt-1">
              High = direct data provided. Med = derived from related inputs.
              Low = limited data. More inputs = higher confidence. See the
              methodology page for details.
            </dd>
          </div>
        </dl>
      </details>
    </>
  );

  if (defaultCollapsed) {
    return (
      <details
        aria-label="What this is"
        className="animate-fade-up [animation-delay:300ms] mt-6 rounded-xl border border-cream-200 bg-cream-50 text-sm text-neutral-600"
      >
        <summary className="cursor-pointer rounded px-5 py-4 font-medium text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-800/30">
          About this tool
        </summary>
        <div className="px-5 pb-5">
          {content}
        </div>
      </details>
    );
  }

  return (
    <section
      aria-label="What this is"
      className="animate-fade-up [animation-delay:300ms] mt-6 rounded-xl border border-cream-200 bg-cream-50 px-5 py-5 text-sm text-neutral-600"
    >
      {content}
    </section>
  );
}
