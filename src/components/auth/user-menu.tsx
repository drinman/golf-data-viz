"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { ChevronDown, LogOut, History, Presentation } from "lucide-react";
import { signOut } from "@/lib/supabase/auth-client";
import type { User } from "@supabase/supabase-js";

interface UserMenuProps {
  user: User;
}

export function UserMenu({ user }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Click-outside to close
  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
      setOpen(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, handleClickOutside]);

  // Escape key to close
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  const displayEmail = user.email ?? "Account";
  const truncatedEmail =
    displayEmail.length > 24
      ? displayEmail.slice(0, 21) + "..."
      : displayEmail;

  async function handleSignOut() {
    await signOut();
    setOpen(false);
    // Full page reload to clear all client-side auth state (intentional)
    window.location.href = "/";
  }

  return (
    <div ref={menuRef} className="relative" data-testid="user-menu">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        data-testid="user-menu-trigger"
        className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-medium text-neutral-600 transition-colors hover:bg-cream-100 hover:text-neutral-950"
      >
        <span className="max-w-[160px] truncate">{truncatedEmail}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          data-testid="user-menu-dropdown"
          className="absolute right-0 top-full mt-1 w-48 rounded-lg border border-cream-200 bg-white py-1 shadow-lg"
        >
          <Link
            href="/strokes-gained/history"
            onClick={() => setOpen(false)}
            data-testid="user-menu-history"
            className="flex items-center gap-2 px-3 py-2 text-sm text-neutral-700 transition-colors hover:bg-cream-50 hover:text-neutral-950"
          >
            <History className="h-4 w-4" />
            History
          </Link>
          <Link
            href="/strokes-gained/lesson-prep"
            onClick={() => setOpen(false)}
            data-testid="user-menu-lesson-prep"
            className="flex items-center gap-2 px-3 py-2 text-sm text-neutral-700 transition-colors hover:bg-cream-50 hover:text-neutral-950"
          >
            <Presentation className="h-4 w-4" />
            Lesson Prep
          </Link>
          <div className="mx-3 my-1 border-t border-cream-200" />
          <button
            type="button"
            onClick={handleSignOut}
            data-testid="user-menu-signout"
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-neutral-700 transition-colors hover:bg-cream-50 hover:text-neutral-950"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
