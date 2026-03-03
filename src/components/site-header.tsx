import Link from "next/link";
import Image from "next/image";

export function SiteHeader() {
  return (
    <header
      data-testid="site-header"
      className="border-b border-gray-200 bg-white"
    >
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <Link
          href="/"
          className="flex items-center gap-2 text-lg font-bold text-gray-900"
        >
          <Image
            src="/favicon.ico"
            width={28}
            height={28}
            alt="Golf Data Viz logo"
          />
          Golf Data Viz
        </Link>
        <nav className="flex gap-4">
          <Link
            href="/strokes-gained"
            className="text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            SG Benchmarker
          </Link>
          <Link
            href="/methodology"
            className="text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            Methodology
          </Link>
        </nav>
      </div>
    </header>
  );
}
