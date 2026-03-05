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
        <nav className="flex gap-4">
          <Link
            href="/methodology"
            className="text-xs text-neutral-500 transition-colors hover:text-neutral-700"
          >
            Methodology
          </Link>
          <Link
            href="/privacy"
            className="text-xs text-neutral-500 transition-colors hover:text-neutral-700"
          >
            Privacy
          </Link>
        </nav>
      </div>
    </footer>
  );
}
