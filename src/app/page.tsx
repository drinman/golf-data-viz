import { LandingCta } from "./_components/landing-cta";

export default function Home() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-16 sm:py-24">
      {/* Hero */}
      <section className="text-center">
        <h1
          data-testid="hero-headline"
          className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl"
        >
          Know where your strokes go
        </h1>
        <p className="mt-4 text-lg text-gray-600">
          Enter your round stats, see where you gain and lose strokes compared to
          golfers at your handicap level — not Tour pros.
        </p>
        <div className="mt-8">
          <LandingCta />
        </div>
      </section>

      {/* How it works */}
      <section data-testid="how-it-works" className="mt-20">
        <h2 className="text-center text-2xl font-bold text-gray-900">
          How it works
        </h2>
        <div className="mt-10 grid gap-8 sm:grid-cols-3">
          <div data-testid="step-1" className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-lg font-bold text-green-700">
              1
            </div>
            <h3 className="mt-4 text-base font-semibold text-gray-900">
              Enter your stats
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              Score, fairways, greens, putts, and scoring breakdown from your
              round.
            </p>
          </div>
          <div data-testid="step-2" className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-lg font-bold text-green-700">
              2
            </div>
            <h3 className="mt-4 text-base font-semibold text-gray-900">
              See your breakdown
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              Get a strokes gained analysis across four categories benchmarked
              against your handicap peers.
            </p>
          </div>
          <div data-testid="step-3" className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-lg font-bold text-green-700">
              3
            </div>
            <h3 className="mt-4 text-base font-semibold text-gray-900">
              Share with your group
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              Download a shareable card or copy a link to show your buddies
              where you stack up.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
