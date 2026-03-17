import Link from "next/link";
import { PenLine, BarChart3, Share2 } from "lucide-react";
import { ContourBg } from "@/components/contour-bg";
import { SampleResultPreview } from "@/components/sample-result-preview";
import { getSampleResult } from "@/lib/golf/sample-round";
import { LandingCta } from "./_components/landing-cta";

interface HomePageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function Home({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const utmSource = typeof params.utm_source === "string" ? params.utm_source : undefined;

  const sample = getSampleResult();

  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden px-4 py-16 sm:py-24 md:py-32">
        <ContourBg className="text-brand-900" />
        <div
          data-testid="hero-content"
          className="relative mx-auto max-w-4xl"
        >
          <p className="animate-fade-up text-xs font-semibold uppercase tracking-[0.18em] text-brand-800 sm:text-sm sm:tracking-[0.22em]">
            Strokes Gained Benchmarker
          </p>
          <h1
            data-testid="hero-headline"
            className="animate-fade-up mt-4 max-w-[10ch] font-display text-4xl leading-[0.95] tracking-tight text-neutral-950 sm:text-5xl md:text-6xl"
          >
            Where did your strokes go?
          </h1>
          <p className="animate-fade-up delay-1 mt-6 max-w-[22rem] text-base leading-relaxed text-neutral-600 sm:max-w-xl sm:text-lg">
            Enter your scorecard stats after a round. See exactly where you
            gained and lost strokes compared to golfers at your level.
          </p>
          <div className="animate-fade-up delay-2 mt-8 sm:mt-10">
            <LandingCta utmSource={utmSource} />
          </div>
        </div>
      </section>

      {/* Sample preview */}
      <section data-testid="sample-preview" className="border-t border-cream-200 px-4 py-14 sm:py-16">
        <div className="mx-auto max-w-4xl">
          <p className="mt-2 text-sm text-neutral-600">
            A strokes gained breakdown showing where your score separated from your peers.
          </p>
          <div className="mt-6">
            <SampleResultPreview {...sample.preview} />
          </div>
          <div className="mt-6">
            <LandingCta
              utmSource={utmSource}
              eventName="sample_preview_cta_clicked"
              testId="sample-preview-cta"
            />
          </div>
        </div>
      </section>

      {/* Social proof bar */}
      <section data-testid="social-proof-bar" className="bg-brand-900 px-4 py-5">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center
          gap-x-6 gap-y-2 text-xs font-medium uppercase tracking-[0.15em] text-cream-100/80 sm:gap-x-8">
          <span>Compared against amateur peers, not Tour pros</span>
          <span className="hidden sm:inline text-accent-500/60" aria-hidden="true">&bull;</span>
          <span>Open methodology &amp; published data sources</span>
          <span className="hidden sm:inline text-accent-500/60" aria-hidden="true">&bull;</span>
          <span>Free — no account required</span>
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
              Strokes Gained breaks your score into categories and measures each
              against golfers at your level. Instead of just knowing your total,
              you see exactly where you gained and lost strokes.
            </p>
            <p>
              Losing strokes to Tour players is expected. Comparing you to your
              handicap peers is what makes practice decisions useful.
            </p>
            <p>
              Off the Tee covers driving and penalties. Approach covers greens
              in regulation. Around the Green covers scrambling. Putting covers
              putt efficiency. Each category benchmarked against golfers at your
              handicap.
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
