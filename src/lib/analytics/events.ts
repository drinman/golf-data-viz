export type AnalyticsEvent =
  | "landing_cta_clicked"
  | "form_started"
  | "calculation_completed"
  | "download_png_clicked"
  | "copy_link_clicked"
  | "shared_round_viewed"
  | "round_saved"
  | "round_save_failed";

export type AnalyticsEventProps = {
  landing_cta_clicked: Record<string, never>;
  form_started: Record<string, never>;
  calculation_completed: Record<string, never>;
  download_png_clicked: { has_share_param: boolean };
  copy_link_clicked: { has_share_param: boolean };
  shared_round_viewed: { referrer: string; utm_source: string };
  round_saved: Record<string, never>;
  round_save_failed: {
    error_type: "config" | "runtime" | "network" | "rate_limited";
  };
};

/**
 * Events that carry no payload — props can be omitted.
 */
export type NoPayloadEvent = {
  [E in AnalyticsEvent]: AnalyticsEventProps[E] extends Record<string, never>
    ? E
    : never;
}[AnalyticsEvent];

/**
 * Events that require a payload — props must be provided.
 */
export type PayloadEvent = Exclude<AnalyticsEvent, NoPayloadEvent>;
