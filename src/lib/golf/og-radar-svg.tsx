/**
 * Static SVG radar chart for OG images.
 * Returns Satori-compatible JSX — no Nivo dependency.
 * Edge-runtime safe (pure math + JSX, no Node-only imports).
 */

import type { RadarChartDatum } from "./types";

/** Map full category names to short abbreviations for the 260px chart. */
const RADAR_LABEL_ABBREV: Record<string, string> = {
  "Off the Tee": "OTT",
  Approach: "APP",
  "Around the Green": "ATG",
  Putting: "PUTT",
};

const GRID_LEVELS = 5;
const PEER_BASELINE = 50; // value on 0-100 scale
const USER_COLOR = "#166534";
const USER_FILL_OPACITY = 0.25;
const GRID_COLOR = "#94a3b8";

interface OgRadarChartProps {
  data: RadarChartDatum[];
  size: number;
}

/**
 * Compute (x, y) for a value on a given axis.
 * Axes start at 12 o'clock (top) and go clockwise.
 */
function polarToCartesian(
  cx: number,
  cy: number,
  radius: number,
  value: number,
  axisIndex: number,
  totalAxes: number,
): { x: number; y: number } {
  const angle = (2 * Math.PI * axisIndex) / totalAxes - Math.PI / 2;
  const fraction = value / 100;
  return {
    x: cx + radius * fraction * Math.cos(angle),
    y: cy + radius * fraction * Math.sin(angle),
  };
}

/** Build an SVG path "M x1,y1 L x2,y2 ... Z" from radar data points. */
function buildPolygonPath(
  data: RadarChartDatum[],
  cx: number,
  cy: number,
  radius: number,
): string {
  const n = data.length;
  const points = data.map((d, i) =>
    polarToCartesian(cx, cy, radius, d.player, i, n),
  );

  return points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)},${p.y.toFixed(2)}`)
    .join(" ") + " Z";
}

export function OgRadarChart({ data, size }: OgRadarChartProps) {
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.38; // leave room for labels
  const n = data.length;

  // Grid circles (5 levels: 20%, 40%, 60%, 80%, 100%)
  const gridCircles = Array.from({ length: GRID_LEVELS }, (_, i) => {
    const r = radius * ((i + 1) / GRID_LEVELS);
    return (
      <circle
        key={`grid-${i}`}
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={GRID_COLOR}
        strokeWidth={0.5}
        opacity={0.2}
      />
    );
  });

  // Axis lines from center to edge
  const axisLines = Array.from({ length: n }, (_, i) => {
    const edge = polarToCartesian(cx, cy, radius, 100, i, n);
    return (
      <line
        key={`axis-${i}`}
        x1={cx}
        y1={cy}
        x2={edge.x}
        y2={edge.y}
        stroke={GRID_COLOR}
        strokeWidth={0.5}
        opacity={0.2}
      />
    );
  });

  // Peer baseline ring (dashed circle at 50%)
  const peerRadius = radius * (PEER_BASELINE / 100);

  // User data polygon
  const polygonPath = buildPolygonPath(data, cx, cy, radius);

  // Axis labels positioned outside the chart using absolute-positioned divs.
  // Satori does NOT support SVG <text> — it throws:
  // "<text> nodes are not currently supported, please convert them to <path>"
  const labelOffset = radius + 24;
  const labels = data.map((d, i) => {
    const pos = polarToCartesian(cx, cy, labelOffset, 100, i, n);
    const abbrev = RADAR_LABEL_ABBREV[d.category] ?? d.category;
    const isSkipped = "skipped" in d && d.skipped;

    return (
      <div
        key={`label-${i}`}
        style={{
          position: "absolute",
          left: pos.x - 30,
          top: pos.y - 10,
          width: 60,
          height: 20,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 14,
          fontWeight: 600,
          color: GRID_COLOR,
          opacity: isSkipped ? 0.3 : 0.9,
        }}
      >
        {abbrev}
      </div>
    );
  });

  return (
    <div style={{ display: "flex", position: "relative", width: size, height: size }}>
      <svg
        viewBox={`0 0 ${size} ${size}`}
        width={size}
        height={size}
        xmlns="http://www.w3.org/2000/svg"
      >
        {gridCircles}
        {axisLines}

        {/* Peer baseline ring */}
        <circle
          cx={cx}
          cy={cy}
          r={peerRadius}
          fill="none"
          stroke={GRID_COLOR}
          strokeWidth={1.5}
          strokeDasharray="6 4"
          opacity={0.7}
        />

        {/* User data polygon */}
        <path
          d={polygonPath}
          fill={USER_COLOR}
          fillOpacity={USER_FILL_OPACITY}
          stroke={USER_COLOR}
          strokeWidth={2}
        />
      </svg>

      {/* Labels are positioned divs outside SVG — Satori can't render SVG <text> */}
      {labels}
    </div>
  );
}
