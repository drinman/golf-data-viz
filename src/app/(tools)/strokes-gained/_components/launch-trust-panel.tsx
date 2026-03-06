"use client";

import Link from "next/link";

const GITHUB_REPO_URL = "https://github.com/drinman/golf-data-viz";

export function LaunchTrustPanel() {
  return (
    <section
      aria-label="What this is"
      className="mt-4 max-w-2xl rounded-xl border border-cream-200 bg-cream-50 px-4 py-4 text-sm text-neutral-700"
    >
      <ul className="space-y-2">
        <li>
          <strong className="text-neutral-950">Beta</strong>
          {" "}
          Benchmarks are provisional, and the methodology and sources are
          published.
        </li>
        <li>
          <strong className="text-neutral-950">Peer proxy</strong>
          {" "}
          Round-level strokes gained estimate versus your handicap bracket, not
          shot-level tracking.
        </li>
        <li>
          <strong className="text-neutral-950">Private</strong>
          {" "}
          No account required. Saving is opt-in and anonymous.
        </li>
        <li>
          <strong className="text-neutral-950">Open</strong>
          {" "}
          <Link href="/methodology" className="underline hover:text-neutral-900">
            Methodology
          </Link>
          {", "}
          <Link href="/privacy" className="underline hover:text-neutral-900">
            Privacy
          </Link>
          {", and "}
          <a
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-neutral-900"
          >
            GitHub
          </a>
          {" "}cover the formulas, data sources, and code.
        </li>
      </ul>

      <details className="mt-4 rounded-lg border border-cream-200 bg-white px-3 py-2">
        <summary className="cursor-pointer font-medium text-neutral-900 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-800/30">
          Common questions
        </summary>
        <dl className="mt-3 space-y-3 text-sm text-neutral-600">
          <div>
            <dt className="font-medium text-neutral-900">
              Why use this instead of 18Birdies, TheGrint, or GHIN?
            </dt>
            <dd className="mt-1">
              Those track scores and round stats. This benchmarks where you
              gained or lost strokes versus golfers at your handicap.
            </dd>
          </div>
          <div>
            <dt className="font-medium text-neutral-900">
              Why use this if I have Arccos?
            </dt>
            <dd className="mt-1">
              Arccos and Shot Scope are better for shot-level tracking. This is
              for quick post-round benchmarking from scorecard stats.
            </dd>
          </div>
          <div>
            <dt className="font-medium text-neutral-900">
              Is this true strokes gained?
            </dt>
            <dd className="mt-1">
              No. It is a proxy model built from round-level inputs. The
              methodology page explains the tradeoffs.
            </dd>
          </div>
          <div>
            <dt className="font-medium text-neutral-900">
              Are you storing my data?
            </dt>
            <dd className="mt-1">
              Only if you opt in to save a round. Shared links contain the round
              stats needed to recreate the chart, so only share them if you are
              comfortable sharing those stats.
            </dd>
          </div>
        </dl>
      </details>
    </section>
  );
}
