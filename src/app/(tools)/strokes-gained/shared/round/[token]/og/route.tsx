import { ImageResponse } from "next/og";
import { type NextRequest } from "next/server";
import { getRoundByShareToken } from "@/lib/golf/round-queries";
import { toStrokesGainedResult } from "@/lib/golf/round-detail-adapter";
import { getBenchmarkMeta } from "@/lib/golf/benchmarks";
import { formatHandicap } from "@/lib/golf/format";
import {
  buildOGCardEntries,
  formatSGForOG,
  truncateText,
  getBracketLabel,
  CONFIDENCE_COLORS_HEX,
  CONFIDENCE_LABELS,
} from "@/lib/golf/og-card-data";

// Node runtime needed for admin client (service role key)
export const runtime = "nodejs";

const SIZE = { width: 1200, height: 630 };

function loadFont(relativePath: string): Promise<ArrayBuffer> {
  return fetch(new URL(relativePath, import.meta.url))
    .then((res) => res.arrayBuffer())
    .catch((err) => {
      console.warn(`[shared-og] Font load failed: ${relativePath}`, err);
      return new ArrayBuffer(0);
    });
}

const fontData = Promise.all([
  loadFont("../../../../../../../assets/fonts/DMSerifDisplay-Regular.ttf"),
  loadFont("../../../../../../../assets/fonts/DMSans-Medium.ttf"),
  loadFont("../../../../../../../assets/fonts/DMSans-SemiBold.ttf"),
]);

interface RouteParams {
  params: Promise<{ token: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const [dmSerifRegular, dmSansMedium, dmSansSemiBold] = await fontData;

  const fontDefs: { name: string; data: ArrayBuffer; weight: 400 | 500 | 600; style: "normal" }[] = [
    { name: "DM Serif Display", data: dmSerifRegular, weight: 400, style: "normal" },
    { name: "DM Sans", data: dmSansMedium, weight: 500, style: "normal" },
    { name: "DM Sans", data: dmSansSemiBold, weight: 600, style: "normal" },
  ];
  const loadedFonts = fontDefs.filter((f) => f.data.byteLength > 0);
  const fontOption = loadedFonts.length > 0 ? { fonts: loadedFonts } : {};

  const { token } = await params;
  const snapshot = await getRoundByShareToken(token);

  // Fallback: generic branded card
  if (!snapshot) {
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
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ fontSize: 40, color: "#fefcf3", fontFamily: "DM Serif Display" }}>
            Round Not Available
          </div>
          <div style={{ fontSize: 20, color: "#b8860b", marginTop: 16 }}>
            golfdataviz.com/strokes-gained
          </div>
        </div>
      ),
      { ...SIZE, ...fontOption }
    );
  }

  const result = toStrokesGainedResult(snapshot);
  const courseName = truncateText(snapshot.courseName, 58);
  const bracketLabel = getBracketLabel(result);
  const meta = getBenchmarkMeta();
  const entries = buildOGCardEntries(result);

  const anchorLabel = result.totalAnchorMode === "course_adjusted"
    ? "Course-Adjusted"
    : result.totalAnchorMode === "course_neutral"
      ? "Course-Neutral"
      : "Scorecard-based";
  const trustLabel = `Proxy SG · ${anchorLabel} · Benchmarks v${meta.version}`;

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
                {`Shot ${snapshot.score} · ${formatHandicap(snapshot.handicapIndex)} HCP · vs ${bracketLabel}`}
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
                  {formatSGForOG(result.total)}
                </div>
              </div>
              <div style={{ fontSize: 14, color: "#7cb899", marginTop: 6 }}>
                Proxy SG
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
            {entries.map(({ label, value, skipped, confidence }, i) => (
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
                    <div style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: CONFIDENCE_COLORS_HEX[confidence].text,
                      backgroundColor: CONFIDENCE_COLORS_HEX[confidence].bg,
                      borderRadius: 4,
                      padding: "2px 8px",
                      letterSpacing: "0.05em",
                    }}>
                      {CONFIDENCE_LABELS[confidence].toUpperCase()}
                    </div>
                    <div
                      style={{
                        fontSize: 26,
                        fontWeight: 600,
                        color: value >= 0 ? "#16a34a" : "#dc2626",
                      }}
                    >
                      {formatSGForOG(value)}
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
