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
      className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-xs text-neutral-500"
    >
      Some rounds were calculated with an older methodology version. Trends here
      are directional.
    </div>
  );
}
