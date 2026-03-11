"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/logo";
import { signOut, useSupabaseUser } from "@/lib/supabase/auth-client";
import { UserMenu } from "@/components/auth/user-menu";
import { AuthModal } from "@/components/auth/auth-modal";
import { trackEvent } from "@/lib/analytics/client";

const PRIMARY_LINKS = [
  { href: "/strokes-gained", label: "SG Benchmarker" },
  { href: "/strokes-gained/history", label: "History" },
  { href: "/methodology", label: "Methodology" },
] as const;

const MOBILE_LOGGED_IN_LINKS = [
  PRIMARY_LINKS[0],
  PRIMARY_LINKS[1],
  { href: "/strokes-gained/lesson-prep", label: "Lesson Prep" },
  PRIMARY_LINKS[2],
] as const;

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, loading } = useSupabaseUser();
  const pathname = usePathname();
  const router = useRouter();
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    function onResize() {
      if (window.innerWidth >= 640) {
        setMobileOpen(false);
      }
    }

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileOpen(false);
      }
    }

    function onPointerDown(event: PointerEvent) {
      if (!headerRef.current?.contains(event.target as Node)) {
        setMobileOpen(false);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [mobileOpen]);

  async function handleMobileSignOut() {
    setMobileOpen(false);
    await signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <>
      <header
        ref={headerRef}
        data-testid="site-header"
        data-scrolled={scrolled ? "true" : "false"}
        className={`sticky top-0 z-50 border-b transition-all duration-200 ${
          scrolled
            ? "border-cream-200 bg-white/90 shadow-sm backdrop-blur-md"
            : "border-cream-200 bg-cream-50/80 backdrop-blur-sm"
        }`}
      >
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2 whitespace-nowrap text-neutral-950"
          >
            <Logo size={28} variant="mark" />
            <span className="font-display text-lg tracking-tight">
              Golf Data Viz
            </span>
          </Link>
          <div className="hidden items-center gap-4 sm:flex">
            <nav aria-label="Main" className="flex gap-4">
              {PRIMARY_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm font-medium text-neutral-600 transition-colors hover:text-neutral-950"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
            {!loading && user && <UserMenu user={user} />}
            {!loading && !user && (
              <button
                type="button"
                data-testid="header-sign-in"
                onClick={() => {
                  setAuthOpen(true);
                  trackEvent("auth_modal_opened", { surface: "header_sign_in" });
                }}
                className="text-sm font-medium text-neutral-600 transition-colors hover:text-neutral-950"
              >
                Sign in
              </button>
            )}
          </div>
          <button
            type="button"
            data-testid="mobile-nav-toggle"
            aria-controls="mobile-nav-panel"
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            onClick={() => setMobileOpen((prev) => !prev)}
            className={`inline-flex h-11 w-11 items-center justify-center rounded-full border border-cream-200 text-neutral-950 transition-all duration-200 sm:hidden ${
              scrolled ? "bg-white/80" : "bg-cream-50/80"
            }`}
          >
            <span className="relative h-5 w-5">
              <Menu
                className={`absolute inset-0 h-5 w-5 transition-[opacity,transform] duration-150 ease-out ${
                  mobileOpen ? "scale-95 opacity-0" : "scale-100 opacity-100"
                }`}
              />
              <X
                className={`absolute inset-0 h-5 w-5 transition-[opacity,transform] duration-150 ease-out ${
                  mobileOpen ? "scale-100 opacity-100" : "scale-95 opacity-0"
                }`}
              />
            </span>
          </button>
        </div>
        <div
          id="mobile-nav-panel"
          data-testid="mobile-nav-panel"
          data-state={mobileOpen ? "open" : "closed"}
          className={`absolute inset-x-0 top-full origin-top transition-[opacity,transform] duration-200 ease-out sm:hidden ${
            mobileOpen
              ? "pointer-events-auto translate-y-0 opacity-100"
              : "pointer-events-none -translate-y-2 opacity-0"
          }`}
        >
          <div className="mx-auto max-w-3xl px-4 pb-4">
            <div
              className={`rounded-b-xl border-b border-cream-200 p-2 ${
                scrolled
                  ? "bg-white/95 shadow-md backdrop-blur-md"
                  : "bg-cream-50/95 shadow-md backdrop-blur-sm"
              }`}
            >
              <nav aria-label="Mobile main navigation" className="space-y-1">
                {!loading && user && (
                  <div
                    className={`px-3 pb-2 pt-3 text-sm text-neutral-600 ${mobileOpen ? "animate-fade-up delay-1" : ""}`}
                  >
                    {user.email}
                  </div>
                )}
                {(user ? MOBILE_LOGGED_IN_LINKS : PRIMARY_LINKS).map((link, index) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className={`block min-h-11 rounded-lg px-3 py-2 text-base font-medium text-neutral-800 transition-colors hover:bg-cream-100 hover:text-neutral-950 ${
                      mobileOpen ? "animate-fade-up" : ""
                    }`}
                    style={mobileOpen ? { animationDelay: `${(index + (user ? 2 : 1)) * 40}ms` } : undefined}
                  >
                    {link.label}
                  </Link>
                ))}
                {!loading && !user && (
                  <button
                    type="button"
                    data-testid="mobile-nav-sign-in"
                    onClick={() => {
                      setMobileOpen(false);
                      setAuthOpen(true);
                      trackEvent("auth_modal_opened", { surface: "header_sign_in" });
                    }}
                    className={`block min-h-11 w-full rounded-lg px-3 py-2 text-left text-base font-medium text-neutral-800 transition-colors hover:bg-cream-100 hover:text-neutral-950 ${
                      mobileOpen ? "animate-fade-up" : ""
                    }`}
                    style={mobileOpen ? { animationDelay: "160ms" } : undefined}
                  >
                    Sign in
                  </button>
                )}
                {!loading && user && (
                  <div>
                    <div className="my-2 border-t border-cream-200" />
                    <button
                      type="button"
                      onClick={handleMobileSignOut}
                      className={`block min-h-11 w-full rounded-lg px-3 py-2 text-left text-base font-medium text-neutral-800 transition-colors hover:bg-cream-100 hover:text-neutral-950 ${
                        mobileOpen ? "animate-fade-up" : ""
                      }`}
                      style={mobileOpen ? { animationDelay: "200ms" } : undefined}
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </nav>
            </div>
          </div>
        </div>
      </header>
      {authOpen && (
        <AuthModal
          open={authOpen}
          onClose={() => setAuthOpen(false)}
          onSuccess={() => {
            setAuthOpen(false);
            window.location.reload();
          }}
        />
      )}
    </>
  );
}
