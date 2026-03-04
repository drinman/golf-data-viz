/**
 * Topographic contour background pattern.
 * Renders faint concentric contour lines that evoke golf course
 * terrain mapping — ties into the contour mark logo concept.
 */
export function ContourBg({ className }: { className?: string }) {
  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className ?? ""}`}
      aria-hidden="true"
    >
      <svg
        className="h-full w-full"
        viewBox="0 0 800 600"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
      >
        <path
          d="M400 50c-160 0-300 120-300 280s140 220 300 220 300-60 300-220S560 50 400 50z"
          stroke="currentColor"
          strokeWidth="1"
          opacity="0.04"
        />
        <path
          d="M400 120c-120 0-220 90-220 200s100 160 220 160 220-50 220-160-100-200-220-200z"
          stroke="currentColor"
          strokeWidth="0.8"
          opacity="0.035"
        />
        <path
          d="M400 190c-80 0-150 60-150 130s70 110 150 110 150-40 150-110-70-130-150-130z"
          stroke="currentColor"
          strokeWidth="0.6"
          opacity="0.03"
        />
        <path
          d="M400 250c-45 0-85 35-85 70s40 60 85 60 85-25 85-60-40-70-85-70z"
          stroke="currentColor"
          strokeWidth="0.5"
          opacity="0.025"
        />
      </svg>
    </div>
  );
}
