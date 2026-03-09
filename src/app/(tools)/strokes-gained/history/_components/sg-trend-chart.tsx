"use client";

import { useEffect, useMemo } from "react";
import { ResponsiveLine } from "@nivo/line";
import type { LineCustomSvgLayerProps } from "@nivo/line";
import type { TrendSeries, RoundSgSnapshot } from "@/lib/golf/trends";
import { CATEGORY_LABELS } from "@/lib/golf/constants";
import { trackEvent } from "@/lib/analytics/client";

interface SgTrendChartProps {
  series: TrendSeries[];
  rounds: RoundSgSnapshot[];
}

/** Custom zero-line layer — dashed line at y=0 labeled "Peer Average" */
function ZeroLine({ yScale, innerWidth }: LineCustomSvgLayerProps<TrendSeries>) {
  const y = (yScale as (value: number) => number)(0);

  return (
    <g data-testid="zero-line">
      <line
        x1={0}
        x2={innerWidth}
        y1={y}
        y2={y}
        stroke="#94a3b8"
        strokeWidth={1}
        strokeDasharray="6 4"
        opacity={0.6}
      />
      <text
        x={innerWidth + 4}
        y={y}
        fill="#94a3b8"
        fontSize={10}
        dominantBaseline="middle"
        fontFamily="system-ui, sans-serif"
      >
        Peer Avg
      </text>
    </g>
  );
}

export function SgTrendChart({ series, rounds }: SgTrendChartProps) {
  useEffect(() => {
    if (rounds.length >= 3) {
      trackEvent("trend_chart_viewed", { round_count: rounds.length });
    }
  }, [rounds.length]);

  // Build tooltip lookup: "Round N" → { date, courseName, values }
  const tooltipData = useMemo(() => {
    const sorted = [...rounds].sort(
      (a, b) => new Date(a.playedAt).getTime() - new Date(b.playedAt).getTime()
    );
    const map = new Map<
      string,
      { date: string; courseName: string; values: Record<string, number> }
    >();
    sorted.forEach((r, i) => {
      const label = `Round ${i + 1}`;
      map.set(label, {
        date: new Date(r.playedAt + "T00:00:00").toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
        courseName: r.courseName,
        values: {
          "off-the-tee": r.sgOffTheTee,
          approach: r.sgApproach,
          "around-the-green": r.sgAroundTheGreen,
          putting: r.sgPutting,
        },
      });
    });
    return map;
  }, [rounds]);

  if (rounds.length < 3) {
    return (
      <div
        data-testid="trend-chart-min-rounds"
        className="rounded-xl border border-card-border bg-card p-8 text-center shadow-sm"
      >
        <p className="text-neutral-600">
          Enter a few more rounds to see trends.
        </p>
        <p className="mt-1 text-sm text-neutral-500">
          Trends require at least 3 rounds.
        </p>
      </div>
    );
  }

  return (
    <div data-testid="sg-trend-chart" style={{ height: 360 }}>
      <ResponsiveLine
        data={series}
        margin={{ top: 20, right: 90, bottom: 50, left: 50 }}
        xScale={{ type: "point" }}
        yScale={{ type: "linear", stacked: false }}
        curve="linear"
        enablePoints
        pointSize={8}
        pointColor={{ theme: "background" }}
        pointBorderWidth={2}
        pointBorderColor={{ from: "serieColor" }}
        colors={(d) => d.color}
        lineWidth={2}
        enableGridX={false}
        enableGridY
        axisBottom={{
          tickSize: 0,
          tickPadding: 8,
          tickRotation: rounds.length > 10 ? -45 : 0,
        }}
        axisLeft={{
          tickSize: 0,
          tickPadding: 8,
          format: (v) => (v > 0 ? `+${v}` : `${v}`),
        }}
        layers={[
          "grid",
          "markers",
          "axes",
          ZeroLine,
          "lines",
          "points",
          "slices",
          "mesh",
          "legends",
        ]}
        useMesh
        enableSlices={false}
        motionConfig="gentle"
        legends={[
          {
            anchor: "right",
            direction: "column",
            translateX: 85,
            itemWidth: 80,
            itemHeight: 20,
            itemTextColor: "#64748b",
            symbolSize: 10,
            symbolShape: "circle",
          },
        ]}
        tooltip={({ point }) => {
          const roundLabel = point.data.xFormatted as string;
          const info = tooltipData.get(roundLabel);
          const categoryId = point.seriesId as string;
          const categoryLabel =
            CATEGORY_LABELS[
              categoryId as keyof typeof CATEGORY_LABELS
            ] ?? categoryId;
          const value = point.data.y as number;

          return (
            <div className="rounded-lg border border-neutral-200 bg-white px-3 py-2 shadow-md">
              {info && (
                <p className="text-xs text-neutral-500">
                  {info.date} &middot; {info.courseName}
                </p>
              )}
              <p className="mt-0.5 text-sm font-medium text-neutral-900">
                <span
                  className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: point.seriesColor }}
                />
                {categoryLabel}:{" "}
                <span className="font-mono">
                  {value > 0 ? `+${value.toFixed(1)}` : value.toFixed(1)}
                </span>
              </p>
            </div>
          );
        }}
      />
    </div>
  );
}
