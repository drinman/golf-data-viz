"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Logo } from "@/components/logo";

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      data-testid="site-header"
      className={`sticky top-0 z-50 border-b transition-all duration-200 ${
        scrolled
          ? "border-cream-200 bg-white/90 shadow-sm backdrop-blur-md"
          : "border-cream-200 bg-cream-50/80 backdrop-blur-sm"
      }`}
    >
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <Link
          href="/"
          className="flex items-center gap-2 text-neutral-950"
        >
          <Logo size={28} variant="mark" />
          <span className="font-display text-lg tracking-tight">
            Golf Data Viz
          </span>
        </Link>
        <nav aria-label="Main" className="flex gap-4">
          <Link
            href="/strokes-gained"
            className="text-sm font-medium text-neutral-600 transition-colors hover:text-neutral-950"
          >
            SG Benchmarker
          </Link>
          <Link
            href="/methodology"
            className="text-sm font-medium text-neutral-600 transition-colors hover:text-neutral-950"
          >
            Methodology
          </Link>
        </nav>
      </div>
    </header>
  );
}
