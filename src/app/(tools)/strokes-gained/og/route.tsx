import { ImageResponse } from "next/og";
import { type NextRequest } from "next/server";
import { decodeRound } from "@/lib/golf/share-codec";
import { getBracketForHandicap } from "@/lib/golf/benchmarks";
import { calculateStrokesGained } from "@/lib/golf/strokes-gained";
import type { StrokesGainedCategory } from "@/lib/golf/types";
import { BRACKET_LABELS } from "@/lib/golf/constants";

export const runtime = "edge";

const SIZE = { width: 1200, height: 630 };

const CATEGORY_LABELS: Record<StrokesGainedCategory, string> = {
  "off-the-tee": "Off the Tee",
  approach: "Approach",
  "around-the-green": "Around the Green",
  putting: "Putting",
};

const CATEGORY_ORDER: StrokesGainedCategory[] = [
  "off-the-tee",
  "approach",
  "around-the-green",
  "putting",
];

function formatSG(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}`;
}

export async function GET(request: NextRequest) {
  const payload = request.nextUrl.searchParams.get("d") ?? undefined;
  const input = payload ? decodeRound(payload) : null;

  // Fallback: generic branded card
  if (!input) {
    return new ImageResponse(
      (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            height: "100%",
            backgroundColor: "#f9fafb",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <div style={{ fontSize: 56, fontWeight: 700, color: "#111827" }}>
            Strokes Gained Benchmarker
          </div>
          <div
            style={{
              fontSize: 28,
              color: "#6b7280",
              marginTop: 16,
            }}
          >
            See where you gain and lose strokes vs your handicap peers
          </div>
          <div style={{ fontSize: 20, color: "#d1d5db", marginTop: 48 }}>
            golfdataviz.com
          </div>
        </div>
      ),
      { ...SIZE }
    );
  }

  // Compute SG results
  const benchmark = getBracketForHandicap(input.handicapIndex);
  const result = calculateStrokesGained(input, benchmark);
  const bracketLabel =
    BRACKET_LABELS[result.benchmarkBracket] ?? result.benchmarkBracket;

  const entries = CATEGORY_ORDER.map((key) => ({
    label: CATEGORY_LABELS[key],
    value: result.categories[key],
  }));

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          backgroundColor: "#ffffff",
          padding: 64,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Header row */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 44, fontWeight: 700, color: "#111827" }}>
              {input.course}
            </div>
            <div style={{ fontSize: 24, color: "#6b7280", marginTop: 8 }}>
              {`Shot ${input.score} · vs ${bracketLabel}`}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
            }}
          >
            <div
              style={{
                fontSize: 52,
                fontWeight: 700,
                color: result.total >= 0 ? "#16a34a" : "#dc2626",
              }}
            >
              {formatSG(result.total)}
            </div>
            <div style={{ fontSize: 18, color: "#9ca3af" }}>Total SG</div>
          </div>
        </div>

        {/* Category bars */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 20,
            marginTop: 56,
          }}
        >
          {entries.map(({ label, value }) => (
            <div
              key={label}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                backgroundColor: "#f9fafb",
                borderRadius: 12,
                padding: "20px 32px",
              }}
            >
              <div
                style={{ fontSize: 28, fontWeight: 500, color: "#374151" }}
              >
                {label}
              </div>
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 600,
                  color: value >= 0 ? "#16a34a" : "#dc2626",
                }}
              >
                {formatSG(value)}
              </div>
            </div>
          ))}
        </div>

        {/* Watermark */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginTop: "auto",
            paddingTop: 24,
          }}
        >
          <div style={{ fontSize: 18, color: "#d1d5db" }}>
            Golf Data Viz · golfdataviz.com
          </div>
        </div>
      </div>
    ),
    { ...SIZE }
  );
}
