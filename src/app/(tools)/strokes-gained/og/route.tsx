import { ImageResponse } from "next/og";
import { type NextRequest } from "next/server";
import { decodeRound } from "@/lib/golf/share-codec";
import { getInterpolatedBenchmark } from "@/lib/golf/benchmarks";
import { calculateStrokesGained } from "@/lib/golf/strokes-gained";
import { calculateStrokesGainedV3 } from "@/lib/golf/strokes-gained-v3";
import { getSgPhase2Mode } from "@/lib/golf/phase2-mode";
import { buildFamiliarStats } from "@/lib/golf/format";
import {
  buildCompactSGRow,
  truncateText,
} from "@/lib/golf/og-card-data";
import { generateShareHeadline, SENTIMENT_COLORS } from "@/lib/golf/share-headline";

export const runtime = "edge";

const SIZE = { width: 1200, height: 630 };

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

export async function GET(request: NextRequest) {
  const [dmSerifRegular, dmSansMedium, dmSansSemiBold] = await fontData;

  const fontDefs: { name: string; data: ArrayBuffer; weight: 400 | 500 | 600; style: "normal" }[] = [
    { name: "DM Serif Display", data: dmSerifRegular, weight: 400, style: "normal" },
    { name: "DM Sans", data: dmSansMedium, weight: 500, style: "normal" },
    { name: "DM Sans", data: dmSansSemiBold, weight: 600, style: "normal" },
  ];
  const loadedFonts = fontDefs.filter((f) => f.data.byteLength > 0);
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
      { ...SIZE, ...fontOption, headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } }
    );
  }

  // Compute SG results
  const benchmark = getInterpolatedBenchmark(input.handicapIndex);
  const phase2Mode = getSgPhase2Mode();
  const result = phase2Mode === "full"
    ? calculateStrokesGainedV3(input, benchmark)
    : calculateStrokesGained(input, benchmark);
  const courseName = truncateText(input.course, 58);
  const compactSG = buildCompactSGRow(result);
  const headline = generateShareHeadline(result, {
    score: input.score,
    courseName: input.course,
  });

  const headlineColor = SENTIMENT_COLORS[headline.sentiment];

  const familiarLine = buildFamiliarStats({
    handicapIndex: input.handicapIndex,
    greensInRegulation: input.greensInRegulation,
    totalPutts: input.totalPutts,
  }).join(" · ");

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
        {/* Score hero */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            paddingTop: 48,
          }}
        >
          <div
            style={{
              fontSize: 140,
              fontWeight: 400,
              color: "#fefcf3",
              fontFamily: "DM Serif Display",
              lineHeight: 1,
            }}
          >
            {String(input.score)}
          </div>
          <div
            style={{
              fontSize: 36,
              fontWeight: 400,
              color: "#fefcf3",
              fontFamily: "DM Serif Display",
              marginTop: 8,
            }}
          >
            {courseName}
          </div>
          <div style={{ fontSize: 22, color: "#a8d5ba", marginTop: 8, fontWeight: 500 }}>
            {familiarLine}
          </div>
        </div>

        {/* Gold separator */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginTop: 24,
          }}
        >
          <div style={{ width: 120, height: 1, backgroundColor: "#b8860b", opacity: 0.6 }} />
        </div>

        {/* One-line takeaway */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginTop: 20,
          }}
        >
          <div style={{ fontSize: 24, color: headlineColor, fontWeight: 500 }}>
            {headline.line}
          </div>
        </div>

        {/* Compact SG row */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginTop: 16,
          }}
        >
          <div
            style={{
              display: "flex",
              backgroundColor: "rgba(255,255,255,0.08)",
              borderRadius: 10,
              padding: "12px 32px",
            }}
          >
            <div style={{ fontSize: 20, color: "#a8d5ba", fontWeight: 600, letterSpacing: "0.05em" }}>
              {compactSG}
            </div>
          </div>
        </div>

        {/* Watermark */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginTop: "auto",
            paddingBottom: 28,
          }}
        >
          <div style={{ fontSize: 16, color: "#b8860b" }}>
            golfdataviz.com
          </div>
        </div>
      </div>
    ),
    { ...SIZE, ...fontOption, headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } }
  );
}
