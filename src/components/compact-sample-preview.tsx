interface CategoryValue {
  label: string;
  value: number;
}

interface CompactSamplePreviewProps {
  categories: CategoryValue[];
  total: number;
  courseName: string;
  handicap: number;
  // Accept but ignore chart-related props for interface compatibility
  chartData?: unknown;
  bracketLabel?: string;
}

function formatSG(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}`;
}

export function CompactSamplePreview({
  categories,
  total,
  courseName,
  handicap,
}: CompactSamplePreviewProps) {
  return (
    <div
      data-testid="compact-sample-preview"
      className="rounded-lg border border-cream-200 bg-cream-50 px-5 py-3"
    >
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
        Example: {handicap}-handicap round at {courseName}
      </p>

      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-5">
        {categories.map((cat) => (
          <div key={cat.label} className="text-center">
            <p className="text-xs text-neutral-500">{cat.label}</p>
            <p
              className={`font-mono text-sm font-semibold tabular-nums ${
                cat.value >= 0 ? "text-data-positive" : "text-data-negative"
              }`}
            >
              {formatSG(cat.value)}
            </p>
          </div>
        ))}
        <div className="text-center">
          <p className="text-xs text-neutral-500">Total SG</p>
          <p
            className={`font-mono text-base font-semibold tabular-nums ${
              total >= 0 ? "text-data-positive" : "text-data-negative"
            }`}
          >
            {formatSG(total)}
          </p>
        </div>
      </div>

      <p className="mt-2 text-xs text-neutral-400">
        Sample output — enter your round below
      </p>
    </div>
  );
}
