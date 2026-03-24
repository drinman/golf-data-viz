interface MethodologyVersionBannerProps {
  visible: boolean;
}

export function MethodologyVersionBanner({
  visible,
}: MethodologyVersionBannerProps) {
  if (!visible) return null;

  return (
    <div
      data-testid="methodology-version-banner"
      className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-700"
    >
      Some rounds were calculated with an older methodology version. Trends here
      are directional.
    </div>
  );
}
