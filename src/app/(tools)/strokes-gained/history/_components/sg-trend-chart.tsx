"use client";

import { useEffect, useMemo } from "react";
import { ResponsiveLine } from "@nivo/line";
import type { LineCustomSvgLayerProps } from "@nivo/line";
import type { TrendSeries, RoundSgSnapshot } from "@/lib/golf/trends";
import { computeYDomain } from "@/lib/golf/trends";
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
      const label = String(i + 1);
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

  const yDomain = useMemo(() => computeYDomain(series), [series]);

  const yTicks = useMemo(() => {
    const step = 0.5;
    const ticks: number[] = [];
    let v = Math.floor(yDomain.min / step) * step;
    while (v <= yDomain.max + step * 0.01) {
      ticks.push(Math.round(v * 10) / 10);
      v += step;
    }
    if (!ticks.includes(0)) ticks.push(0);
    return ticks.sort((a, b) => a - b);
  }, [yDomain]);

  // Drop the bottom-most tick label so it doesn't collide with x-axis labels.
  // Grid lines still use the full set.
  const yTickLabels = useMemo(
    () => yTicks.filter((t) => t > yDomain.min),
    [yTicks, yDomain.min]
  );

  if (rounds.length < 3) {
    return (
      <div
        data-testid="trend-chart-min-rounds"
        className="p-8 text-center"
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
    <>
      <p className="mb-1 text-xs text-neutral-400">Oldest → Newest</p>
      <div data-testid="sg-trend-chart" style={{ height: 360 }}>
        <ResponsiveLine
          data={series}
          margin={{ top: 20, right: 140, bottom: 60, left: 50 }}
          xScale={{ type: "point" }}
          yScale={{ type: "linear", stacked: false, min: yDomain.min, max: yDomain.max }}
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
          gridYValues={yTicks}
          axisBottom={{
            tickSize: 5,
            tickPadding: 12,
            format: (v) => {
              const n = Number(v);
              // Show every label ≤10 rounds, every 2nd for 11-20, every 5th for 20+
              const step = rounds.length <= 10 ? 1 : rounds.length <= 20 ? 2 : 5;
              return n % step === 0 || n === 1 ? `R${n}` : "";
            },
          }}
          axisLeft={{
            tickSize: 0,
            tickPadding: 8,
            tickValues: yTickLabels,
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
              translateX: 135,
              itemWidth: 130,
              itemHeight: 20,
              itemTextColor: "#64748b",
              symbolSize: 10,
              symbolShape: "circle",
            },
          ]}
          tooltip={({ point }) => {
            const roundLabel = point.data.xFormatted as string;
            const info = tooltipData.get(roundLabel);
            const categoryLabel = point.seriesId as string;
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
    </>
  );
}
