import { loadBrackets } from "@/lib/golf/benchmarks";
import { BRACKET_LABELS } from "@/lib/golf/constants";

/**
 * Static SVG bar chart comparing a key metric across all brackets.
 * Server Component — no client hydration.
 */
export function BenchmarkVisual() {
  const brackets = loadBrackets();
  const maxScore = Math.max(...brackets.map((b) => b.averageScore));

  // Chart dimensions
  const width = 600;
  const height = 280;
  const barGap = 8;
  const leftPad = 60;
  const rightPad = 16;
  const topPad = 24;
  const bottomPad = 48;
  const chartWidth = width - leftPad - rightPad;
  const chartHeight = height - topPad - bottomPad;
  const barWidth = (chartWidth - barGap * (brackets.length - 1)) / brackets.length;

  // Scale: 60 to max+5
  const minY = 60;
  const maxY = Math.ceil(maxScore / 5) * 5 + 5;
  const scale = (v: number) =>
    topPad + chartHeight - ((v - minY) / (maxY - minY)) * chartHeight;

  // Y-axis ticks
  const ticks: number[] = [];
  for (let t = minY; t <= maxY; t += 10) ticks.push(t);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full max-w-xl"
      role="img"
      aria-label="Average score by handicap bracket"
    >
      {/* Y-axis labels and gridlines */}
      {ticks.map((t) => (
        <g key={t}>
          <line
            x1={leftPad}
            y1={scale(t)}
            x2={width - rightPad}
            y2={scale(t)}
            stroke="#e5e5e5"
            strokeDasharray="4 4"
          />
          <text
            x={leftPad - 8}
            y={scale(t) + 4}
            textAnchor="end"
            className="fill-neutral-400 text-[11px]"
          >
            {t}
          </text>
        </g>
      ))}

      {/* Bars */}
      {brackets.map((b, i) => {
        const x = leftPad + i * (barWidth + barGap);
        const barH = ((b.averageScore - minY) / (maxY - minY)) * chartHeight;
        const y = topPad + chartHeight - barH;
        return (
          <g key={b.bracket}>
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={barH}
              rx={3}
              className="fill-brand-600"
            />
            <text
              x={x + barWidth / 2}
              y={y - 6}
              textAnchor="middle"
              className="fill-neutral-700 text-[10px] font-medium"
            >
              {b.averageScore.toFixed(0)}
            </text>
            <text
              x={x + barWidth / 2}
              y={height - bottomPad + 16}
              textAnchor="middle"
              className="fill-neutral-500 text-[10px]"
            >
              {BRACKET_LABELS[b.bracket].replace(" HCP", "")}
            </text>
          </g>
        );
      })}

      {/* X-axis label */}
      <text
        x={width / 2}
        y={height - 4}
        textAnchor="middle"
        className="fill-neutral-400 text-[11px]"
      >
        Handicap Bracket
      </text>
    </svg>
  );
}
