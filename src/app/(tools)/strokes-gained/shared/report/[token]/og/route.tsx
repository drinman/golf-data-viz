import { readFileSync } from "fs";
import { join } from "path";
import { ImageResponse } from "next/og";
import { getLessonReportByShareToken } from "@/lib/golf/round-queries";
import { formatSG, presentSG } from "@/lib/golf/format";

export const runtime = "nodejs";

const SIZE = { width: 1200, height: 630 };
const CACHE_HEADERS = {
  "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
};
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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const [dmSerifRegular, dmSansMedium, dmSansSemiBold] = fontData;
  const fontDefs: {
    name: string;
    data: ArrayBuffer;
    weight: 400 | 500 | 600;
    style: "normal";
  }[] = [
    { name: "DM Serif Display", data: dmSerifRegular, weight: 400, style: "normal" },
    { name: "DM Sans", data: dmSansMedium, weight: 500, style: "normal" },
    { name: "DM Sans", data: dmSansSemiBold, weight: 600, style: "normal" },
  ];
  const loadedFonts = fontDefs.filter((font) => font.data.byteLength > 0);
  const fontOption = loadedFonts.length > 0 ? { fonts: loadedFonts } : {};
  const { token } = await params;
  const snapshot = await getLessonReportByShareToken(token);

  if (!snapshot) {
    return new ImageResponse(
      (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            height: "100%",
            backgroundColor: "#0f3d22",
            color: "#fefcf3",
            fontSize: 42,
            fontFamily: "DM Sans",
          }}
        >
          Lesson Prep Report Not Available
        </div>
      ),
      { ...SIZE, ...fontOption, headers: CACHE_HEADERS }
    );
  }

  const report = snapshot.reportData;
  const isCaveatedReport = report.trustMode === "caveated";

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          backgroundColor: "#fefcf3",
          color: "#292524",
          padding: "44px 56px",
          fontFamily: "DM Sans",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            backgroundColor: "#0f3d22",
            color: "#fefcf3",
            borderRadius: 24,
            padding: "34px 40px",
          }}
        >
          <div style={{ fontSize: 16, letterSpacing: "0.25em", textTransform: "uppercase", opacity: 0.75 }}>
            Lesson Prep Report
          </div>
          <div style={{ marginTop: 14, fontFamily: "DM Serif Display", fontSize: 48, fontWeight: 400 }}>
            {`${report.summary.roundCount} rounds · ${formatSG(report.summary.averageSgTotal)} Avg SG`}
          </div>
          <div style={{ marginTop: 10, fontSize: 24, color: "#cfe8d8" }}>
            {isCaveatedReport
              ? `${report.summary.startDate} to ${report.summary.endDate} · reliable round patterns`
              : `${report.summary.startDate} to ${report.summary.endDate}`}
          </div>
        </div>

        <div style={{ display: "flex", gap: 18, marginTop: 26 }}>
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              borderRadius: 22,
              backgroundColor: "#ffffff",
              border: "1px solid #e7e5e4",
              padding: "24px 24px",
            }}
          >
            <div style={{ fontSize: 14, letterSpacing: "0.18em", textTransform: "uppercase", color: "#a8a29e" }}>
              {isCaveatedReport ? "Round Pattern" : "Primary Focus Area"}
            </div>
            <div style={{ marginTop: 12, fontFamily: "DM Serif Display", fontSize: 34, fontWeight: 400 }}>
              {report.focusArea.label}
            </div>
            <div style={{ marginTop: 8, fontSize: 24, color: presentSG(report.focusArea.averageSg).tone === "neutral" ? "#57534e" : "#dc2626" }}>
              {formatSG(report.focusArea.averageSg)}
            </div>
          </div>

          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              borderRadius: 22,
              backgroundColor: "#ffffff",
              border: "1px solid #e7e5e4",
              padding: "24px 24px",
            }}
          >
            <div style={{ fontSize: 14, letterSpacing: "0.18em", textTransform: "uppercase", color: "#a8a29e" }}>
              {isCaveatedReport ? "Reliable Signal" : "Strongest Area"}
            </div>
            <div style={{ marginTop: 12, fontFamily: "DM Serif Display", fontSize: 34, fontWeight: 400 }}>
              {report.strongestArea.label}
            </div>
            <div style={{ marginTop: 8, fontSize: 24, color: presentSG(report.strongestArea.averageSg).tone === "neutral" ? "#57534e" : "#16a34a" }}>
              {formatSG(report.strongestArea.averageSg)}
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: 18,
            display: "flex",
            flexDirection: "column",
            borderRadius: 22,
            backgroundColor: "#ffffff",
            border: "1px solid #e7e5e4",
            padding: "24px 24px",
          }}
        >
          <div style={{ fontSize: 14, letterSpacing: "0.18em", textTransform: "uppercase", color: "#a8a29e" }}>
            Trend Signal
          </div>
          <div style={{ marginTop: 12, fontFamily: "DM Serif Display", fontSize: 28, fontWeight: 400 }}>
            {report.trendSignal.label}
          </div>
          <div style={{ marginTop: 8, fontSize: 18, color: "#57534e" }}>
            {report.trendSignal.copyText}
          </div>
        </div>
      </div>
    ),
    { ...SIZE, ...fontOption, headers: CACHE_HEADERS }
  );
}
