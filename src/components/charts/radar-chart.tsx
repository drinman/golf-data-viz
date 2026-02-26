"use client";

import { ResponsiveRadar } from "@nivo/radar";
import type { RadarChartDatum } from "@/lib/golf/types";

/** Nivo requires Record<string, unknown> compatibility; add index signature. */
type NivoRadarDatum = RadarChartDatum & Record<string, unknown>;

interface RadarChartProps {
  data: RadarChartDatum[];
}

export function RadarChart({ data }: RadarChartProps) {
  return (
    <div style={{ minHeight: 300, maxHeight: 500, height: "100%", width: "100%" }}>
      <ResponsiveRadar<NivoRadarDatum>
        data={data as NivoRadarDatum[]}
        keys={["player", "peerAverage"]}
        indexBy="category"
        maxValue={100}
        margin={{ top: 60, right: 80, bottom: 40, left: 80 }}
        curve="linearClosed"
        borderWidth={2}
        borderColor={{ from: "color" }}
        gridLevels={5}
        gridShape="circular"
        gridLabelOffset={16}
        colors={["#22c55e", "#94a3b8"]}
        fillOpacity={0.25}
        blendMode="normal"
        motionConfig="gentle"
        dotSize={8}
        dotColor={{ theme: "background" }}
        dotBorderWidth={2}
        dotBorderColor={{ from: "color" }}
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
              { id: "peerAverage", label: "Peer Avg", color: "#94a3b8" },
            ],
          },
        ]}
      />
    </div>
  );
}
