import type { Metadata } from "next";

const EFFECTIVE_DATE = "March 4, 2026";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Golf Data Viz handles your data — what we collect, how it's stored, and your rights.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <main>
      {/* ── Hero ── */}
      <div className="border-b border-cream-200 bg-cream-50">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
          <h1 className="font-display text-3xl tracking-tight text-neutral-950 sm:text-4xl">
            Privacy Policy
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-neutral-600">
            Golf Data Viz is built by a golfer, for golfers. It is a free,
            post-round benchmark built from the scorecard stats you enter
            manually. We collect only what we need to show your peer-compared
            results and support the product.
          </p>
          <p className="mt-3 text-sm text-neutral-500">
            Effective {EFFECTIVE_DATE}
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-10">
      {/* What we collect */}
      <section
        className="scroll-mt-8"
        data-testid="privacy-collect"
      >
        <h2 className="font-display text-xl tracking-tight text-neutral-950">
          What We Collect
        </h2>
        <p className="mt-3 text-sm text-neutral-600">
          To generate results, the app uses the round stats you enter. If you
          opt in to save a round, we store only the stats you provide:
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-6 text-sm text-neutral-600">
          <li>Score, course rating, and slope rating</li>
          <li>Fairways hit, greens in regulation, and total putts</li>
          <li>Penalty strokes and scoring distribution (birdies, pars, bogeys, etc.)</li>
          <li>Course name and handicap bracket</li>
        </ul>
      </section>

      {/* What we do NOT collect */}
      <section
        className="mt-10 border-t border-cream-200 pt-8"
        data-testid="privacy-not-collect"
      >
        <h2 className="font-display text-xl tracking-tight text-neutral-950">
          What We Don&apos;t Collect
        </h2>
        <ul className="mt-3 list-disc space-y-1 pl-6 text-sm text-neutral-600">
          <li>
            <strong>No account required</strong> — you can use the SG
            Benchmarker without signing up
          </li>
          <li>
            <strong>No personally identifying information</strong> — we
            don&apos;t ask for your name, email, or location
          </li>
          <li>
            <strong>No GPS or shot-level data</strong> — we work from aggregate
            round stats only
          </li>
        </ul>
      </section>

      {/* How data is stored */}
      <section
        className="mt-10 border-t border-cream-200 pt-8"
        data-testid="privacy-storage"
      >
        <h2 className="font-display text-xl tracking-tight text-neutral-950">
          How Data Is Stored
        </h2>
        <p className="mt-3 text-sm text-neutral-600">
          If you opt in to save a round, the round stats are stored anonymously
          in a{" "}
          <a
            href="https://supabase.com"
            className="text-brand-800 underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Supabase
          </a>
          -hosted PostgreSQL database. The tool does not require accounts, so
          saved rounds are not tied to your name or email. Direct public writes
          are disabled, and saves go through a server-side validation path
          before reaching the database. When you opt in to save, we also use{" "}
          <a
            href="https://www.cloudflare.com/products/turnstile/"
            className="text-brand-800 underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Cloudflare Turnstile
          </a>{" "}
          to distinguish humans from bots before an anonymous round is written.
        </p>
      </section>

      {/* Sharing */}
      <section
        className="mt-10 border-t border-cream-200 pt-8"
        data-testid="privacy-sharing"
      >
        <h2 className="font-display text-xl tracking-tight text-neutral-950">
          Sharing
        </h2>
        <p className="mt-3 text-sm text-neutral-600">
          Sharing is <strong>opt-in</strong>. If you share a results link, it
          contains encoded, reversible round stats needed to recreate the
          chart. We do not sell, rent, or share your data with third parties.
        </p>
      </section>

      {/* Analytics */}
      <section
        className="mt-10 border-t border-cream-200 pt-8"
        data-testid="privacy-analytics"
      >
        <h2 className="font-display text-xl tracking-tight text-neutral-950">
          Analytics &amp; Error Tracking
        </h2>
        <ul className="mt-3 list-disc space-y-1 pl-6 text-sm text-neutral-600">
          <li>
            We use Vercel Analytics and optional GA4 for aggregate usage
            signals.
          </li>
          <li>
            We do not send round stat fields (score, fairways, GIR, putts,
            penalties, category counts) to analytics platforms.
          </li>
          <li>
            Sentry is used for error diagnostics.
          </li>
          <li>
            When you opt in to anonymous save, Cloudflare Turnstile may process
            technical browser, device, and network signals to help prevent
            automated abuse.
          </li>
        </ul>
      </section>

      {/* Contact */}
      <section
        className="mt-10 border-t border-cream-200 pt-8"
        data-testid="privacy-contact"
      >
        <h2 className="font-display text-xl tracking-tight text-neutral-950">
          Questions?
        </h2>
        <p className="mt-3 text-sm text-neutral-600">
          If you have questions about how we handle data, open an issue on{" "}
          <a
            href="https://github.com/drinman/golf-data-viz"
            className="text-brand-800 underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>{" "}
          or reach out on{" "}
          <a
            href="https://reddit.com/r/golf"
            className="text-brand-800 underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            r/golf
          </a>
          .
        </p>
      </section>

      <footer className="mt-16 border-t border-neutral-200 pt-6 pb-8">
        <p className="text-xs italic leading-relaxed text-neutral-400">
          This policy applies to golfdataviz.com. Last updated {EFFECTIVE_DATE}.
        </p>
      </footer>
      </div>
    </main>
  );
}
