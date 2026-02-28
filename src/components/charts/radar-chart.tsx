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
}

/**
 * Factory that creates a custom Nivo layer rendering a dashed reference
 * circle at the 50 mark (peer average baseline) with a label.
 */
function createPeerRingLayer(label: string) {
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
        <text
          x={centerX}
          y={centerY - radius - 6}
          textAnchor="middle"
          fill="#94a3b8"
          fontSize={10}
          fontFamily="system-ui, sans-serif"
        >
          {label} Avg
        </text>
      </g>
    );
  };
}

export function RadarChart({ data, bracketLabel }: RadarChartProps) {
  type Layer = RadarLayerId | RadarCustomLayer<NivoRadarDatum>;

  const layers = useMemo((): Layer[] => {
    const base: Layer[] = ["grid"];
    if (bracketLabel) {
      base.push(createPeerRingLayer(bracketLabel) as RadarCustomLayer<NivoRadarDatum>);
    }
    base.push("layers", "slices", "dots", "legends");
    return base;
  }, [bracketLabel]);

  return (
    <div style={{ minHeight: 300, maxHeight: 500, height: "100%", width: "100%" }}>
      <ResponsiveRadar<NivoRadarDatum>
        data={data as NivoRadarDatum[]}
        keys={["player"]}
        indexBy="category"
        maxValue={100}
        margin={{ top: 70, right: 80, bottom: 40, left: 80 }}
        curve="linearClosed"
        borderWidth={2}
        borderColor={{ from: "color" }}
        gridLevels={5}
        gridShape="circular"
        gridLabelOffset={16}
        colors={["#22c55e"]}
        fillOpacity={0.25}
        blendMode="normal"
        motionConfig="gentle"
        dotSize={8}
        dotColor={{ theme: "background" }}
        dotBorderWidth={2}
        dotBorderColor={{ from: "color" }}
        layers={layers}
        legends={[
          {
            anchor: "top-left",
            direction: "column",
            translateX: -50,
            translateY: -40,
            itemWidth: 100,
            itemHeight: 20,
            itemTextColor: "#94a3b8",
            symbolSize: 12,
            symbolShape: "circle",
            data: [
              { id: "player", label: "You", color: "#22c55e" },
              {
                id: "peerBaseline",
                label: bracketLabel ? `${bracketLabel} Avg` : "Peer Avg",
                color: "#94a3b8",
              },
            ],
          },
        ]}
      />
    </div>
  );
}
