"use client";

import { useMemo } from "react";
import { ResponsiveRadar } from "@nivo/radar";
import type { RadarLayerId, RadarCustomLayer } from "@nivo/radar";
import type { RadarChartDatum } from "@/lib/golf/types";

/** Nivo requires Record<string, unknown> compatibility; add index signature. */
type NivoRadarDatum = RadarChartDatum & Record<string, unknown>;

interface RadarChartProps {
  data: RadarChartDatum[];
  /** e.g. "10–15 HCP" — displayed on the reference ring label */
  bracketLabel?: string;
  /** Compact mode for mini charts — tighter margins, no legends, no dots */
  compact?: boolean;
  /** Override chart fill colors (default: ["#166534"]) */
  colors?: string[];
  /** Override chart fill opacity (default: 0.25) */
  fillOpacity?: number;
}

/**
 * Factory that creates a custom Nivo layer rendering a dashed reference
 * circle at the 50 mark (peer average baseline) with a label.
 */
function createPeerRingLayer(label: string, hideLabel = false) {
  return function PeerAverageRing({
    centerX,
    centerY,
    radiusScale,
  }: {
    centerX: number;
    centerY: number;
    radiusScale: (value: number) => number;
  }) {
    const radius = radiusScale(50);
    return (
      <g data-testid="peer-average-ring">
        <circle
          cx={centerX}
          cy={centerY}
          r={radius}
          fill="none"
          stroke="#94a3b8"
          strokeWidth={1.5}
          strokeDasharray="6 4"
          opacity={0.7}
        />
        {!hideLabel && (
          <text
            x={centerX}
            y={centerY - radius - 6}
            textAnchor="middle"
            fill="#94a3b8"
            fontSize={10}
            fontFamily="DM Sans, system-ui, sans-serif"
          >
            {label} Avg
          </text>
        )}
      </g>
    );
  };
}

export function RadarChart({
  data,
  bracketLabel,
  compact = false,
  colors: colorsProp = ["#166534"],
  fillOpacity: fillOpacityProp = 0.25,
}: RadarChartProps) {
  type Layer = RadarLayerId | RadarCustomLayer<NivoRadarDatum>;

  const layers = useMemo((): Layer[] => {
    const base: Layer[] = ["grid"];
    if (bracketLabel) {
      base.push(createPeerRingLayer(bracketLabel, compact) as RadarCustomLayer<NivoRadarDatum>);
    }
    base.push("layers", "slices", "dots", "legends");
    return base;
  }, [bracketLabel, compact]);

  const margin = compact
    ? { top: 16, right: 24, bottom: 16, left: 24 }
    : { top: 70, right: 80, bottom: 40, left: 80 };

  const legends = compact
    ? []
    : [
        {
          anchor: "top-left" as const,
          direction: "column" as const,
          translateX: -50,
          translateY: -40,
          itemWidth: 100,
          itemHeight: 20,
          itemTextColor: "#94a3b8",
          symbolSize: 12,
          symbolShape: "circle" as const,
          data: [
            { id: "player", label: "You", color: colorsProp[0] },
            {
              id: "peerBaseline",
              label: bracketLabel ? `${bracketLabel} Avg` : "Peer Avg",
              color: "#94a3b8",
            },
          ],
        },
      ];

  const wrapperStyle = compact
    ? { maxHeight: 500, height: "100%", width: "100%" }
    : { minHeight: 300, maxHeight: 500, height: "100%", width: "100%" };

  return (
    <div style={wrapperStyle}>
      <ResponsiveRadar<NivoRadarDatum>
        data={data as NivoRadarDatum[]}
        keys={["player"]}
        indexBy="category"
        maxValue={100}
        margin={margin}
        curve="linearClosed"
        borderWidth={2}
        borderColor={{ from: "color" }}
        gridLevels={5}
        gridShape="circular"
        gridLabelOffset={16}
        colors={colorsProp}
        fillOpacity={fillOpacityProp}
        blendMode="normal"
        motionConfig="gentle"
        dotSize={compact ? 0 : 8}
        dotColor={{ theme: "background" }}
        dotBorderWidth={compact ? 0 : 2}
        dotBorderColor={{ from: "color" }}
        layers={layers}
        legends={legends}
      />
    </div>
  );
}
