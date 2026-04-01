"use client";

import { useEffect, useRef, useState } from "react";
import { Share2 } from "lucide-react";
import type { RoundDetailSnapshot, StrokesGainedCategory } from "@/lib/golf/types";
import {
  RoundLayout,
  deriveRoundData,
} from "@/app/(tools)/strokes-gained/_components/round-layout";
import { captureElementAsPng } from "@/lib/capture";
import { shareImage } from "@/lib/share";
import { trackEvent } from "@/lib/analytics/client";
import { RecipientCta } from "@/app/(tools)/strokes-gained/_components/recipient-cta";
import { InterstitialCta } from "@/app/(tools)/strokes-gained/_components/interstitial-cta";
import { getPresentationPercentiles, type PercentileResult } from "@/lib/golf/percentile";
import { CATEGORY_LABELS } from "@/lib/golf/constants";

interface SharedRoundClientProps {
  snapshot: RoundDetailSnapshot;
}

export function SharedRoundClient({ snapshot }: SharedRoundClientProps) {
  const derived = deriveRoundData(snapshot);
  const shareCardRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);

  const percentiles = getPresentationPercentiles(derived.sgResult, derived.presentationTrust);
  const strongestEntry = (Object.entries(percentiles) as [StrokesGainedCategory, PercentileResult | null][])
    .filter(([, v]) => v !== null)
    .sort(([, a], [, b]) => b!.percentile - a!.percentile)[0];

  useEffect(() => {
    trackEvent("shared_saved_round_viewed", {
      referrer: document.referrer || "direct",
    });
  }, []);

  async function handleShareImage() {
    if (!shareCardRef.current || saving) return;
    setSaving(true);
    try {
      const blob = await captureElementAsPng(shareCardRef.current);
      const filename = `${snapshot.courseName.replace(/\s+/g, "-").toLowerCase()}-sg-${snapshot.playedAt}.png`;
      const outcome = await shareImage(blob, filename);
      trackEvent("saved_round_png_shared", {
        round_id: snapshot.roundId,
        surface: "shared_page",
        share_method: outcome,
      });
    } finally {
      setSaving(false);
    }
  }

  const ctaUrl = `/strokes-gained?handicap=${snapshot.handicapIndex}&utm_source=share&utm_medium=cta&utm_campaign=round_share`;

  return (
    <RoundLayout
      snapshot={snapshot}
      derived={derived}
      shareCardRef={shareCardRef}
      headerBadge={
        strongestEntry ? (
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-100/80">
            {CATEGORY_LABELS[strongestEntry[0]]}:{" "}
            <span className="font-mono text-data-positive-on-dark">
              Top {100 - strongestEntry[1]!.percentile}%
            </span>{" "}
            of {derived.bracketLabel} golfers
          </p>
        ) : undefined
      }
      interstitial={
        <InterstitialCta
          senderHandicap={snapshot.handicapIndex}
          senderResult={derived.sgResult}
          senderChartData={derived.chartData}
          bracketLabel={derived.bracketLabel}
          surface="token_share"
        />
      }
      actions={
        <div className="text-center">
          <RecipientCta
            senderHandicap={snapshot.handicapIndex}
            senderResult={derived.sgResult}
            surface="token_share"
          />

          <button
            type="button"
            data-testid="share-image"
            onClick={handleShareImage}
            disabled={saving}
            className="mt-6 inline-flex items-center gap-1.5 text-xs text-neutral-400 transition-colors hover:text-neutral-600 disabled:opacity-50"
          >
            <Share2 className="h-3.5 w-3.5" />
            {saving ? "Preparing..." : "Share"}
          </button>
        </div>
      }
      bottomCta={
        <div data-testid="bottom-cta" className="text-center">
          <p className="text-sm text-neutral-600">
            Ready to see your numbers?
          </p>
          <a
            href={ctaUrl}
            onClick={() => trackEvent("bottom_cta_clicked", { surface: "token_share" })}
            className="mt-2 inline-flex items-center text-sm font-medium text-brand-800 underline transition-colors hover:text-brand-700"
          >
            Find Where You&apos;re Losing Strokes — Free
          </a>
        </div>
      }
    />
  );
}
