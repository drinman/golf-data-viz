import { ImageResponse } from "next/og";
import { type NextRequest } from "next/server";
import { decodeRound } from "@/lib/golf/share-codec";
import { getBracketForHandicap, getBenchmarkMeta } from "@/lib/golf/benchmarks";
import { calculateStrokesGained } from "@/lib/golf/strokes-gained";
import type { StrokesGainedCategory } from "@/lib/golf/types";
import { BRACKET_LABELS } from "@/lib/golf/constants";

export const runtime = "edge";

const SIZE = { width: 1200, height: 630 };

// ─── Color tokens (Satori requires inline hex — see globals.css :root for source of truth) ───
// brand-900: #0f3d22  │  cream-50: #fefcf3  │  gold-500: #b8860b
// data-positive: #16a34a  │  data-negative: #dc2626
// neutral-800: #292524  │  neutral-400: #a8a29e

// Module-scope: loaded once, cached for all requests.
// Wrapped in try/catch so vitest (which can't fetch file:// URLs) falls back gracefully.
function loadFont(relativePath: string): Promise<ArrayBuffer> {
  return fetch(new URL(relativePath, import.meta.url))
    .then((res) => res.arrayBuffer())
    .catch(() => new ArrayBuffer(0));
}

const fontData = Promise.all([
  loadFont("../../../../assets/fonts/DMSerifDisplay-Regular.ttf"),
  loadFont("../../../../assets/fonts/DMSans-Medium.ttf"),
  loadFont("../../../../assets/fonts/DMSans-SemiBold.ttf"),
]);

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

function truncateText(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max - 1)}…`;
}

export async function GET(request: NextRequest) {
  const [dmSerifRegular, dmSansMedium, dmSansSemiBold] = await fontData;

  // Only include fonts that loaded successfully (empty in vitest where file:// fetch fails)
  const fontDefs: { name: string; data: ArrayBuffer; weight: 400 | 500 | 600; style: "normal" }[] = [
    { name: "DM Serif Display", data: dmSerifRegular, weight: 400, style: "normal" },
    { name: "DM Sans", data: dmSansMedium, weight: 500, style: "normal" },
    { name: "DM Sans", data: dmSansSemiBold, weight: 600, style: "normal" },
  ];
  const loadedFonts = fontDefs.filter((f) => f.data.byteLength > 0);
  // When no custom fonts loaded (e.g. vitest), omit `fonts` so ImageResponse uses its default
  const fontOption = loadedFonts.length > 0 ? { fonts: loadedFonts } : {};

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
            width: "100%",
            height: "100%",
            backgroundColor: "#0f3d22",
            fontFamily: "DM Sans",
          }}
        >
          {/* Main content */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              flex: 1,
              padding: 64,
            }}
          >
            <div
              style={{
                fontSize: 56,
                fontWeight: 400,
                color: "#fefcf3",
                fontFamily: "DM Serif Display",
              }}
            >
              Strokes Gained Benchmarker
            </div>
            <div
              style={{
                fontSize: 28,
                color: "#a8d5ba",
                marginTop: 16,
                fontWeight: 500,
              }}
            >
              See where you gain and lose strokes vs your handicap peers
            </div>
          </div>
          {/* Gold separator + watermark */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              paddingBottom: 32,
            }}
          >
            <div style={{ width: 120, height: 1, backgroundColor: "#b8860b", opacity: 0.6 }} />
            <div style={{ fontSize: 18, color: "#b8860b", marginTop: 16 }}>
              golfdataviz.com/strokes-gained
            </div>
          </div>
        </div>
      ),
      { ...SIZE, ...fontOption }
    );
  }

  // Compute SG results
  const benchmark = getBracketForHandicap(input.handicapIndex);
  const result = calculateStrokesGained(input, benchmark);
  const courseName = truncateText(input.course, 58);
  const bracketLabel =
    BRACKET_LABELS[result.benchmarkBracket] ?? result.benchmarkBracket;
  const meta = getBenchmarkMeta();
  const trustLabel = `Peer-compared SG${meta.provisional ? " · Beta" : ""} · Benchmarks v${meta.version}`;

  const skippedSet = new Set(result.skippedCategories);
  const estimatedSet = new Set(result.estimatedCategories);
  const entries = CATEGORY_ORDER.map((key) => ({
    label: CATEGORY_LABELS[key],
    value: result.categories[key],
    skipped: skippedSet.has(key),
    estimated: estimatedSet.has(key),
  }));

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          fontFamily: "DM Sans",
        }}
      >
        {/* Dark green header band */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            backgroundColor: "#0f3d22",
            padding: "40px 64px 32px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                maxWidth: 820,
                paddingRight: 24,
              }}
            >
              <div
                style={{
                  fontSize: 44,
                  fontWeight: 400,
                  color: "#fefcf3",
                  fontFamily: "DM Serif Display",
                }}
              >
                {courseName}
              </div>
              <div style={{ fontSize: 22, color: "#a8d5ba", marginTop: 8, fontWeight: 500 }}>
                {`Shot ${input.score} · vs ${bracketLabel}`}
              </div>
              <div style={{ fontSize: 14, color: "#7cb899", marginTop: 6, fontStyle: "italic", fontWeight: 500 }}>
                {trustLabel}
              </div>
            </div>
            {/* Total SG circular badge */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                minWidth: 130,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 100,
                  height: 100,
                  borderRadius: 50,
                  border: `3px solid ${result.total >= 0 ? "#16a34a" : "#dc2626"}`,
                  backgroundColor: result.total >= 0 ? "rgba(22, 163, 74, 0.15)" : "rgba(220, 38, 38, 0.15)",
                }}
              >
                <div
                  style={{
                    fontSize: 32,
                    fontWeight: 600,
                    color: result.total >= 0 ? "#4ade80" : "#fca5a5",
                  }}
                >
                  {formatSG(result.total)}
                </div>
              </div>
              <div style={{ fontSize: 14, color: "#7cb899", marginTop: 6 }}>
                Total SG
              </div>
            </div>
          </div>
          {/* Gold separator */}
          <div style={{ height: 1, backgroundColor: "#b8860b", marginTop: 20, opacity: 0.5 }} />
        </div>

        {/* White body with category rows */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            backgroundColor: "#ffffff",
            padding: "28px 64px 24px",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            {entries.map(({ label, value, skipped, estimated }, i) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  backgroundColor: i % 2 === 0 ? "#ffffff" : "#fefcf3",
                  borderRadius: 10,
                  padding: "16px 28px",
                  borderLeft: skipped ? "none" : `4px solid ${value >= 0 ? "#16a34a" : "#dc2626"}`,
                }}
              >
                <div style={{ fontSize: 26, fontWeight: 500, color: "#292524" }}>
                  {label}
                </div>
                {skipped ? (
                  <div style={{ fontSize: 26, fontWeight: 500, fontStyle: "italic", color: "#a8a29e" }}>
                    Not Tracked
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {estimated && (
                      <div style={{ fontSize: 14, fontWeight: 500, color: "#a8a29e", backgroundColor: "#f5f5f4", borderRadius: 4, padding: "2px 6px" }}>
                        Est.
                      </div>
                    )}
                    <div
                      style={{
                        fontSize: 26,
                        fontWeight: 600,
                        color: value >= 0 ? "#16a34a" : "#dc2626",
                      }}
                    >
                      {formatSG(value)}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div
            style={{
              fontSize: 14,
              color: "#a8a29e",
              textAlign: "center",
              marginTop: 12,
            }}
          >
            + = better than peers · − = room to grow · Dashed line = peer average
          </div>

          {/* Gold watermark */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginTop: "auto",
              paddingTop: 16,
            }}
          >
            <div style={{ fontSize: 16, color: "#b8860b" }}>
              Golf Data Viz · golfdataviz.com/strokes-gained
            </div>
          </div>
        </div>
      </div>
    ),
    { ...SIZE, ...fontOption }
  );
}
