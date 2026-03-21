import { readFileSync } from "fs";
import { join } from "path";
import { ImageResponse } from "next/og";
import { type NextRequest } from "next/server";
import { getRoundByShareToken } from "@/lib/golf/round-queries";
import { toStrokesGainedResult, toRadarChartDataFromSnapshot } from "@/lib/golf/round-detail-adapter";
import { OgRadarChart } from "@/lib/golf/og-radar-svg";
import { buildFamiliarStats } from "@/lib/golf/format";
import {
  buildCompactSGRow,
  truncateText,
} from "@/lib/golf/og-card-data";
import { derivePresentationTrustFromSnapshot } from "@/lib/golf/presentation-trust";
import { generateShareHeadline, SENTIMENT_COLORS } from "@/lib/golf/share-headline";
import { buildPresentationPercentileRow } from "@/lib/golf/percentile";

// Node runtime needed for admin client (service role key)
export const runtime = "nodejs";

const SIZE = { width: 1200, height: 630 };

const FONT_DIR = join(process.cwd(), "src/assets/fonts");

function loadFontSync(filename: string): ArrayBuffer {
  try {
    const buf = readFileSync(join(FONT_DIR, filename));
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  } catch {
    return new ArrayBuffer(0);
  }
}

const fontData = [
  loadFontSync("DMSerifDisplay-Regular.ttf"),
  loadFontSync("DMSans-Medium.ttf"),
  loadFontSync("DMSans-SemiBold.ttf"),
];

interface RouteParams {
  params: Promise<{ token: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const [dmSerifRegular, dmSansMedium, dmSansSemiBold] = fontData;

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
      { ...SIZE, ...fontOption, headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } }
    );
  }

  const result = toStrokesGainedResult(snapshot);
  const presentationTrust = derivePresentationTrustFromSnapshot(snapshot);
  const courseName = truncateText(snapshot.courseName, 58);
  const compactSG = buildCompactSGRow(result);
  const percentileRow = buildPresentationPercentileRow(result, presentationTrust);
  const headline = generateShareHeadline(
    result,
    {
      score: snapshot.score,
      courseName: snapshot.courseName,
    },
    { presentationTrust }
  );

  const headlineColor = SENTIMENT_COLORS[headline.sentiment];
  const radarData = toRadarChartDataFromSnapshot(snapshot);

  const familiarLine = buildFamiliarStats({
    handicapIndex: snapshot.handicapIndex,
    greensInRegulation: snapshot.greensInRegulation,
    totalPutts: snapshot.totalPutts,
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
        {/* Main content: two columns */}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            flex: 1,
            padding: "48px 40px 0 40px",
          }}
        >
          {/* Left column: text content (65%) */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              width: "65%",
            }}
          >
            {/* Score hero */}
            <div
              style={{
                fontSize: 140,
                fontWeight: 400,
                color: "#fefcf3",
                fontFamily: "DM Serif Display",
                lineHeight: 1,
              }}
            >
              {String(snapshot.score)}
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

            {/* Gold separator */}
            <div style={{ display: "flex", justifyContent: "center", marginTop: 24 }}>
              <div style={{ width: 120, height: 1, backgroundColor: "#b8860b", opacity: 0.6 }} />
            </div>

            {/* One-line takeaway */}
            <div style={{ display: "flex", justifyContent: "center", marginTop: 20 }}>
              <div style={{ fontSize: 24, color: headlineColor, fontWeight: 500 }}>
                {headline.line}
              </div>
            </div>

            {/* Compact SG row */}
            <div style={{ display: "flex", justifyContent: "center", marginTop: 16 }}>
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

            {/* Percentile row */}
            {percentileRow && (
              <div style={{ display: "flex", justifyContent: "center", marginTop: 8 }}>
                <div style={{ fontSize: 16, color: "#a8d5ba", opacity: 0.7, letterSpacing: "0.04em" }}>
                  {percentileRow}
                </div>
              </div>
            )}
          </div>

          {/* Right column: radar chart (35%), vertically centered */}
          <div
            style={{
              display: "flex",
              width: "35%",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <OgRadarChart data={radarData} size={260} />
          </div>
        </div>

        {/* Watermark: full width, pinned to bottom */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
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
