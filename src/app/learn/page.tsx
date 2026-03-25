import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumb } from "@/components/seo/breadcrumb";

export const metadata: Metadata = {
  title: "Learn About Strokes Gained",
  description:
    "Understand strokes gained, how amateur golfers compare by handicap, and how to use data to improve your game.",
  alternates: { canonical: "/learn" },
};

const ARTICLES = [
  {
    href: "/learn/strokes-gained-explained",
    title: "Strokes Gained Explained for Amateur Golfers",
    description:
      "What strokes gained means, the four SG categories, and why comparing against your handicap peers matters more than Tour averages.",
    readTime: "8 min read",
  },
  {
    href: "/learn/strokes-gained-calculator",
    title: "Free Strokes Gained Calculator",
    description:
      "How our scorecard-based calculator works, what stats you need, and how to interpret your results.",
    readTime: "5 min read",
  },
  {
    href: "/learn/average-strokes-gained-by-handicap",
    title: "Average Strokes Gained by Handicap",
    description:
      "How golfers at every handicap level perform across key stat categories. Data-backed benchmarks from scratch to 30+.",
    readTime: "6 min read",
  },
  {
    href: "/learn/strokes-gained-putting",
    title: "Strokes Gained Putting: What Amateurs Get Wrong",
    description:
      "Why putting SG is misunderstood, how GIR affects your putting numbers, and what the data actually shows.",
    readTime: "6 min read",
  },
] as const;

export default function LearnIndexPage() {
  return (
    <main>
      <div className="border-b border-cream-200 bg-cream-50">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:py-24 md:py-32">
          <Breadcrumb
            items={[
              { label: "Home", href: "/" },
              { label: "Learn", href: "/learn" },
            ]}
          />
          <h1 className="mt-4 font-display text-3xl tracking-tight text-neutral-950 sm:text-4xl">
            Learn About Strokes Gained
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-neutral-600">
            Guides and data for amateur golfers who want to understand where
            they gain and lose strokes — and what to practice next.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-20 sm:py-24">
        <div className="grid grid-cols-1 gap-6">
          {ARTICLES.map((article) => (
            <Link
              key={article.href}
              href={article.href}
              className="group rounded-lg border border-cream-200 bg-white px-6 py-5 transition-colors hover:border-brand-200 hover:bg-brand-50/30"
            >
              <p className="font-display text-lg tracking-tight text-neutral-950 group-hover:text-brand-800">
                {article.title}
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-neutral-600">
                {article.description}
              </p>
              <p className="mt-2 text-xs text-neutral-400">
                {article.readTime}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
