"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Link2, Check } from "lucide-react";
import type { RoundDetailSnapshot } from "@/lib/golf/types";
import {
  RoundLayout,
  deriveRoundData,
} from "@/app/(tools)/strokes-gained/_components/round-layout";
import { captureElementAsPng, downloadBlob } from "@/lib/capture";
import { trackEvent } from "@/lib/analytics/client";
import { createShareToken } from "@/app/(tools)/strokes-gained/actions";

interface RoundDetailClientProps {
  snapshot: RoundDetailSnapshot;
}

export function RoundDetailClient({ snapshot }: RoundDetailClientProps) {
  const derived = deriveRoundData(snapshot);
  const shareCardRef = useRef<HTMLDivElement>(null);
  const [isPending, startTransition] = useTransition();
  const [linkCopied, setLinkCopied] = useState(false);
  const [clipboardFailed, setClipboardFailed] = useState(false);
  const [tokenError, setTokenError] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  useEffect(() => {
    trackEvent("round_detail_viewed", {
      round_id: snapshot.roundId,
      methodology_version: snapshot.methodologyVersion,
    });
  }, [snapshot.roundId, snapshot.methodologyVersion]);

  async function handleDownloadPng() {
    if (!shareCardRef.current) return;
    const blob = await captureElementAsPng(shareCardRef.current);
    const filename = `${snapshot.courseName.replace(/\s+/g, "-").toLowerCase()}-sg-${snapshot.playedAt}.png`;
    downloadBlob(blob, filename);
    trackEvent("saved_round_png_downloaded", {
      round_id: snapshot.roundId,
      surface: "round_detail",
    });
  }

  function handleCopyShareLink() {
    startTransition(async () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);

      const result = await createShareToken(snapshot.roundId);
      if (result.success) {
        let copied = false;
        try {
          await navigator.clipboard.writeText(result.shareUrl);
          copied = true;
        } catch {
          // Fallback: hidden textarea + execCommand
          const textarea = document.createElement("textarea");
          textarea.value = result.shareUrl;
          textarea.style.position = "fixed";
          textarea.style.left = "-9999px";
          document.body.appendChild(textarea);
          try {
            textarea.select();
            const ok = document.execCommand("copy");
            if (!ok) throw new Error("execCommand returned false");
            copied = true;
          } catch {
            // both methods failed
          } finally {
            document.body.removeChild(textarea);
          }
        }

        if (copied) {
          setClipboardFailed(false);
          setLinkCopied(true);
          copyTimerRef.current = setTimeout(() => setLinkCopied(false), 2000);
          trackEvent("share_link_copied", {
            round_id: snapshot.roundId,
            surface: "round_detail",
          });
        } else {
          setLinkCopied(false);
          setClipboardFailed(true);
          copyTimerRef.current = setTimeout(() => setClipboardFailed(false), 2000);
        }

        if (result.created) {
          trackEvent("share_token_created", {
            round_id: snapshot.roundId,
          });
        }
      } else {
        setTokenError(true);
        copyTimerRef.current = setTimeout(() => setTokenError(false), 2000);
      }
    });
  }

  return (
    <RoundLayout
      snapshot={snapshot}
      derived={derived}
      shareCardRef={shareCardRef}
      methodologyLink
      beforeHeader={
        <div className="animate-fade-up">
          <Link
            href="/strokes-gained/history"
            className="group inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-brand-800 transition-all hover:-translate-x-0.5 hover:text-brand-700"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            Back to History
          </Link>
        </div>
      }
      actions={
        <div className="text-center">
          <h2 className="font-display text-lg text-neutral-950">
            Share This Round
          </h2>
          <p className="mt-1 text-sm text-neutral-500">
            Send your performance snapshot to a buddy or your coach.
          </p>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleDownloadPng}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg border-2 border-cream-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-800 shadow-sm transition-colors hover:border-brand-800/30 hover:bg-cream-50"
            >
              <Download className="h-4 w-4" />
              Download PNG
            </button>

            <button
              type="button"
              onClick={handleCopyShareLink}
              disabled={isPending}
              className={`inline-flex min-h-11 items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium shadow-sm transition-colors disabled:opacity-50 ${
                clipboardFailed || tokenError
                  ? "border-amber-200 bg-amber-50 text-amber-700"
                  : "border-brand-200 bg-brand-50 text-brand-800 hover:bg-brand-100"
              }`}
            >
              {clipboardFailed ? (
                "Failed to copy"
              ) : tokenError ? (
                "Link failed"
              ) : linkCopied ? (
                <>
                  <Check className="h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Link2 className="h-4 w-4" />
                  {isPending ? "Creating…" : "Copy Share Link"}
                </>
              )}
            </button>
          </div>

          <p className="mt-3 text-xs text-neutral-400">
            Shared links give read-only access to this round&apos;s data.
          </p>
        </div>
      }
    />
  );
}
