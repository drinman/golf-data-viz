"use client";

import { forwardRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import type { StrokesGainedResult, RoundInput } from "@/lib/golf/types";
import type { ShareHeadline } from "@/lib/golf/share-headline";
import { CATEGORY_ORDER, CATEGORY_LABELS, BRACKET_LABELS } from "@/lib/golf/constants";
import { presentSG, formatHandicap, buildFamiliarStats, formatScoringBreakdown, formatDate } from "@/lib/golf/format";
import { calculatePercentiles } from "@/lib/golf/percentile";

interface ReceiptCardProps {
  result: StrokesGainedResult;
  roundInput: RoundInput;
  qrUrl: string;
  headline: ShareHeadline;
}

export const ReceiptCard = forwardRef<HTMLDivElement, ReceiptCardProps>(
  function ReceiptCard({ result, roundInput, qrUrl, headline }, ref) {
    const bracketLabel =
      BRACKET_LABELS[result.benchmarkBracket] ?? result.benchmarkBracket;
    const skippedSet = new Set(result.skippedCategories);
    const percentiles = calculatePercentiles(result);
    const totalSg = presentSG(result.total);

    const familiarStats = buildFamiliarStats(roundInput);
    const scoringBreakdown = formatScoringBreakdown(roundInput);

    return (
      <div
        ref={ref}
        data-testid="receipt-card"
        className="w-[1080px] font-mono tabular-nums"
        style={{
          backgroundColor: "#fefcf3",
          fontFamily: "JetBrains Mono, ui-monospace, monospace",
        }}
      >
        {/* ═══ Top perforated edge ═══ */}
        <div
          className="h-3"
          style={{
            backgroundImage:
              "radial-gradient(circle at 10px 0, transparent 8px, #fefcf3 8px)",
            backgroundSize: "20px 12px",
            backgroundPosition: "0 0",
            backgroundRepeat: "repeat-x",
            backgroundColor: "transparent",
          }}
        />

        <div className="px-16 pb-10 pt-6">
          {/* ═══ Dashed top border ═══ */}
          <div className="border-b-2 border-dashed border-neutral-400/50 pb-6">
            <p className="text-center text-xs tracking-[0.5em] text-neutral-400">
              ================================
            </p>
            <p className="mt-3 text-center text-2xl font-bold tracking-[0.35em] text-brand-900">
              GOLF DATA VIZ
            </p>
            <p className="mt-1 text-center text-xs tracking-[0.3em] text-neutral-500">
              STROKES GAINED RECEIPT
            </p>
            <p className="mt-3 text-center text-xs tracking-[0.5em] text-neutral-400">
              ================================
            </p>
          </div>

          {/* ═══ Course & round info ═══ */}
          <div className="mt-6 text-center">
            <p
              className="text-2xl font-bold tracking-tight text-neutral-950"
              style={{ fontFamily: "DM Serif Display, serif" }}
            >
              {roundInput.course}
            </p>
            <p className="mt-2 text-sm text-neutral-600">
              {formatDate(roundInput.date)}
            </p>
            <div className="mt-1 flex items-center justify-center gap-4 text-sm text-neutral-500">
              <span>{formatHandicap(roundInput.handicapIndex)} HCP</span>
              <span>|</span>
              <span>vs {bracketLabel}</span>
            </div>
          </div>

          {/* ═══ Score hero ═══ */}
          <div className="mt-6 text-center">
            <p className="text-8xl font-bold leading-none text-neutral-950">
              {roundInput.score}
            </p>
            <p className="mt-1 text-xs tracking-[0.25em] text-neutral-400">
              FINAL SCORE
            </p>
          </div>

          {/* ═══ Headline ═══ */}
          <p
            className={`mt-4 text-center text-base font-medium ${
              headline.sentiment === "negative"
                ? "text-data-negative"
                : headline.sentiment === "positive"
                  ? "text-data-positive"
                  : "text-neutral-600"
            }`}
          >
            {headline.line}
          </p>

          {/* ═══ Dashed separator ═══ */}
          <div className="mt-6 border-b-2 border-dashed border-neutral-400/40" />

          {/* ═══ SG Category line items ═══ */}
          <div className="mt-6 space-y-0">
            <div className="flex items-center justify-between pb-2 text-xs tracking-wider text-neutral-400">
              <span>CATEGORY</span>
              <span>SG / PERCENTILE</span>
            </div>

            {CATEGORY_ORDER.map((key) => {
              const skipped = skippedSet.has(key);
              const sg = presentSG(result.categories[key]);
              const pct = percentiles[key];

              return (
                <div
                  key={key}
                  className="flex items-center justify-between border-b border-dotted border-neutral-300/60 py-2.5"
                >
                  <span className="text-base text-neutral-800">
                    {CATEGORY_LABELS[key]}
                  </span>
                  {skipped ? (
                    <span className="text-sm italic text-neutral-400">
                      -- N/A --
                    </span>
                  ) : (
                    <span className="flex items-center gap-3">
                      <span
                        className={`text-lg font-bold tabular-nums ${
                          sg.tone === "neutral"
                            ? "text-neutral-500"
                            : sg.tone === "positive"
                              ? "text-data-positive"
                              : "text-data-negative"
                        }`}
                      >
                        {sg.formatted}
                      </span>
                      {pct && (
                        <span className="text-sm text-neutral-400">
                          {pct.shortLabel}
                        </span>
                      )}
                    </span>
                  )}
                </div>
              );
            })}

            {/* SG Total row */}
            <div className="mt-1 flex items-center justify-between border-t-2 border-neutral-800 py-3">
              <span className="text-lg font-bold text-neutral-950">
                SG TOTAL
              </span>
              <span
                className={`text-2xl font-bold tabular-nums ${
                  totalSg.tone === "neutral"
                    ? "text-neutral-500"
                    : totalSg.tone === "positive"
                      ? "text-data-positive"
                      : "text-data-negative"
                }`}
              >
                {totalSg.formatted}
              </span>
            </div>
          </div>

          {/* ═══ Dashed separator ═══ */}
          <div className="mt-4 border-b-2 border-dashed border-neutral-400/40" />

          {/* ═══ Familiar stats ═══ */}
          {familiarStats.length > 0 && (
            <div className="mt-5 text-center">
              <p className="text-xs tracking-wider text-neutral-400">
                ROUND STATS
              </p>
              <p className="mt-1.5 text-sm text-neutral-600">
                {familiarStats.join("  |  ")}
              </p>
            </div>
          )}

          {/* ═══ Scoring breakdown ═══ */}
          {scoringBreakdown.length > 0 && (
            <div className="mt-3 text-center">
              <p className="text-xs tracking-wider text-neutral-400">
                SCORING
              </p>
              <p className="mt-1.5 text-sm text-neutral-600">
                {scoringBreakdown.join("  |  ")}
              </p>
            </div>
          )}

          {/* ═══ Dashed separator ═══ */}
          <div className="mt-5 border-b-2 border-dashed border-neutral-400/40" />

          {/* ═══ QR Code ═══ */}
          <div className="mt-6 flex flex-col items-center">
            <QRCodeSVG
              value={qrUrl}
              size={180}
              bgColor="#fefcf3"
              fgColor="#1c1917"
              level="M"
            />
            <p className="mt-2 text-xs text-neutral-400">
              Scan to see full results
            </p>
          </div>

          {/* ═══ Footer ═══ */}
          <div className="mt-6 text-center">
            <p className="text-base font-bold tracking-[0.3em] text-neutral-800">
              THANK YOU FOR PLAYING
            </p>
            <p className="mt-2 text-sm text-accent-500">
              golfdataviz.com
            </p>
          </div>

          {/* ═══ Bottom decorative border ═══ */}
          <p className="mt-6 text-center text-xs tracking-[0.5em] text-neutral-400">
            ================================
          </p>
        </div>

        {/* ═══ Bottom perforated edge ═══ */}
        <div
          className="h-3"
          style={{
            backgroundImage:
              "radial-gradient(circle at 10px 12px, transparent 8px, #fefcf3 8px)",
            backgroundSize: "20px 12px",
            backgroundPosition: "0 0",
            backgroundRepeat: "repeat-x",
            backgroundColor: "transparent",
          }}
        />
      </div>
    );
  }
);
