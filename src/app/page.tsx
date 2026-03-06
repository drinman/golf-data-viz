import Link from "next/link";
import { PenLine, BarChart3, Share2 } from "lucide-react";
import { ContourBg } from "@/components/contour-bg";
import { LandingCta } from "./_components/landing-cta";

interface HomePageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function Home({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const utmSource = typeof params.utm_source === "string" ? params.utm_source : undefined;

  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden px-4 py-24 sm:py-32">
        <ContourBg className="text-brand-900" />
        <div className="relative mx-auto max-w-4xl">
          <p className="animate-fade-up text-sm font-semibold uppercase tracking-[0.22em] text-brand-800">
            Free post-round benchmark
          </p>
          <h1
            data-testid="hero-headline"
            className="animate-fade-up mt-4 font-display text-5xl tracking-tight text-neutral-950 sm:text-6xl"
          >
            Know where your strokes go
          </h1>
          <p className="animate-fade-up delay-1 mt-6 max-w-xl text-lg text-neutral-600">
            Use the scorecard stats you already track after a round to see
            where you gain and lose strokes compared to golfers at your
            handicap level. No sensors, no subscription, and no Tour-pro
            baseline.
          </p>
          <div className="animate-fade-up delay-2 mt-10">
            <LandingCta utmSource={utmSource} />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section data-testid="how-it-works" className="border-t border-cream-200 px-4 py-20 sm:py-24">
        <div className="mx-auto max-w-4xl">
          <h2 className="animate-fade-up delay-3 font-display text-2xl tracking-tight text-neutral-950 sm:text-3xl">
            How it works
          </h2>
          <div className="mt-12 grid gap-10 sm:grid-cols-3">
            <div data-testid="step-1" className="animate-fade-up delay-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cream-100 text-sm font-semibold text-accent-500">
                <PenLine className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-neutral-950">
                Enter your stats
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-neutral-600">
                Score, fairways, greens, putts, and scoring breakdown from your
                round.
              </p>
            </div>
            <div data-testid="step-2" className="animate-fade-up delay-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cream-100 text-sm font-semibold text-accent-500">
                <BarChart3 className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-neutral-950">
                See your breakdown
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-neutral-600">
                Get a strokes gained analysis across four categories benchmarked
                against your handicap peers.
              </p>
            </div>
            <div data-testid="step-3" className="animate-fade-up delay-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cream-100 text-sm font-semibold text-accent-500">
                <Share2 className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-neutral-950">
                Share with your group
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-neutral-600">
                Download a shareable card or copy a link to show your buddies
                where you stack up.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section
        data-testid="what-is-sg"
        className="border-t border-cream-200 px-4 py-20 sm:py-24"
      >
        <div className="mx-auto max-w-4xl">
          <h2 className="font-display text-2xl tracking-tight text-neutral-950 sm:text-3xl">
            What is Strokes Gained?
          </h2>
          <div className="mt-6 max-w-3xl space-y-4 text-sm leading-relaxed text-neutral-600 sm:text-base">
            <p>
              Strokes Gained shows where your score separated from your peers by
              category, not just raw totals.
            </p>
            <p>
              Losing strokes to Tour players is expected. Comparing you to your
              handicap peers is what makes practice decisions useful.
            </p>
            <p>
              Off the Tee covers driving/penalties, Approach covers GIR
              performance, Around the Green covers scrambling, and Putting
              covers putt efficiency.
            </p>
            <p>
              We publish our exact formulas, data sources, and limitations.{" "}
              <Link
                href="/methodology"
                className="text-brand-800 underline transition-colors hover:text-brand-700"
              >
                See the full methodology &rarr;
              </Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
