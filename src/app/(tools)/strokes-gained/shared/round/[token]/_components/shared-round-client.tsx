"use client";

import { useEffect, useRef } from "react";
import { Download } from "lucide-react";
import type { RoundDetailSnapshot } from "@/lib/golf/types";
import {
  RoundLayout,
  deriveRoundData,
} from "@/app/(tools)/strokes-gained/_components/round-layout";
import { captureElementAsPng, downloadBlob } from "@/lib/capture";
import { trackEvent } from "@/lib/analytics/client";
import { RecipientCta } from "@/app/(tools)/strokes-gained/_components/recipient-cta";
import { InterstitialCta } from "@/app/(tools)/strokes-gained/_components/interstitial-cta";

interface SharedRoundClientProps {
  snapshot: RoundDetailSnapshot;
}

export function SharedRoundClient({ snapshot }: SharedRoundClientProps) {
  const derived = deriveRoundData(snapshot);
  const shareCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    trackEvent("shared_saved_round_viewed", {
      referrer: document.referrer || "direct",
    });
  }, []);

  async function handleDownloadPng() {
    if (!shareCardRef.current) return;
    const blob = await captureElementAsPng(shareCardRef.current);
    const filename = `${snapshot.courseName.replace(/\s+/g, "-").toLowerCase()}-sg-${snapshot.playedAt}.png`;
    downloadBlob(blob, filename);
    trackEvent("saved_round_png_downloaded", {
      round_id: snapshot.roundId,
      surface: "shared_page",
    });
  }

  const ctaUrl = `/strokes-gained?handicap=${snapshot.handicapIndex}&utm_source=share&utm_medium=cta&utm_campaign=round_share`;

  return (
    <RoundLayout
      snapshot={snapshot}
      derived={derived}
      shareCardRef={shareCardRef}
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
            onClick={handleDownloadPng}
            className="mt-6 inline-flex items-center gap-1.5 text-xs text-neutral-400 transition-colors hover:text-neutral-600"
          >
            <Download className="h-3.5 w-3.5" />
            Save image
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
            className="mt-2 inline-block text-sm font-medium text-brand-800 underline transition-colors hover:text-brand-700"
          >
            Compare Your Game — Free
          </a>
        </div>
      }
    />
  );
}
