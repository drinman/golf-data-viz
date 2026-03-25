import Link from "next/link";

const COPYRIGHT_YEAR = 2026;

export function SiteFooter() {
  return (
    <footer
      data-testid="site-footer"
      className="border-t border-cream-200 bg-cream-50/60"
    >
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
        <p className="text-xs text-neutral-400">
          &copy; {COPYRIGHT_YEAR} Golf Data Viz
        </p>
        <nav aria-label="Footer" className="flex gap-4">
          <Link
            href="/methodology"
            className="inline-flex min-h-11 items-center text-xs font-medium text-neutral-500 transition-colors hover:text-neutral-700"
          >
            Methodology
          </Link>
          <Link
            href="/learn"
            className="inline-flex min-h-11 items-center text-xs font-medium text-neutral-500 transition-colors hover:text-neutral-700"
          >
            Learn
          </Link>
          <Link
            href="/benchmarks"
            className="inline-flex min-h-11 items-center text-xs font-medium text-neutral-500 transition-colors hover:text-neutral-700"
          >
            Benchmarks
          </Link>
          <Link
            href="/privacy"
            className="inline-flex min-h-11 items-center text-xs font-medium text-neutral-500 transition-colors hover:text-neutral-700"
          >
            Privacy
          </Link>
        </nav>
      </div>
    </footer>
  );
}
