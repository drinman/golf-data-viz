import { ImageResponse } from "next/og";
import { getLessonReportByShareToken } from "@/lib/golf/round-queries";
import { formatSG } from "@/lib/golf/format";

export const runtime = "nodejs";

const SIZE = { width: 1200, height: 630 };

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
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
          }}
        >
          Lesson Prep Report Not Available
        </div>
      ),
      SIZE
    );
  }

  const report = snapshot.reportData;

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
          <div style={{ marginTop: 14, fontSize: 48, fontWeight: 700 }}>
            {`${report.summary.roundCount} rounds · ${formatSG(report.summary.averageSgTotal)} Avg Proxy SG`}
          </div>
          <div style={{ marginTop: 10, fontSize: 24, color: "#cfe8d8" }}>
            {`${report.summary.startDate} to ${report.summary.endDate}`}
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
              Primary Focus Area
            </div>
            <div style={{ marginTop: 12, fontSize: 34, fontWeight: 700 }}>
              {report.focusArea.label}
            </div>
            <div style={{ marginTop: 8, fontSize: 24, color: "#dc2626" }}>
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
              Strongest Area
            </div>
            <div style={{ marginTop: 12, fontSize: 34, fontWeight: 700 }}>
              {report.strongestArea.label}
            </div>
            <div style={{ marginTop: 8, fontSize: 24, color: "#16a34a" }}>
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
          <div style={{ marginTop: 12, fontSize: 28, fontWeight: 700 }}>
            {report.trendSignal.label}
          </div>
          <div style={{ marginTop: 8, fontSize: 18, color: "#57534e" }}>
            {report.trendSignal.copyText}
          </div>
        </div>
      </div>
    ),
    SIZE
  );
}
