import type { StrokesGainedCategory } from "@/lib/golf/types";

export type AnalyticsEvent =
  | "landing_cta_clicked"
  | "form_started"
  | "calculation_completed"
  | "download_png_clicked"
  | "copy_link_clicked"
  | "shared_round_viewed"
  | "round_saved"
  | "round_save_failed"
  | "gir_estimated"
  | "confidence_badge_clicked"
  | "methodology_tooltip_opened"
  | "result_viewed"
  | "reconciliation_applied"
  | "results_emphasis_impression"
  | "category_detail_interacted";

type EmptyPayload = Record<never, never>;

export type AnalyticsEventProps = {
  landing_cta_clicked: { utm_source?: string };
  form_started: { utm_source?: string };
  calculation_completed: { utm_source?: string };
  download_png_clicked: { has_share_param: boolean; utm_source?: string };
  copy_link_clicked: { has_share_param: boolean; utm_source?: string };
  shared_round_viewed: { referrer: string; utm_source: string };
  round_saved: EmptyPayload;
  gir_estimated: EmptyPayload;
  round_save_failed: {
    error_type:
      | "config"
      | "runtime"
      | "network"
      | "rate_limited"
      | "verification";
  };
  confidence_badge_clicked: { category: string; level: string };
  methodology_tooltip_opened: { category: string; surface: "results_summary" };
  result_viewed: {
    total_anchor_mode?: string;
    methodology_version?: string;
    benchmark_version?: string;
    calibration_version?: string;
    has_course_rating: boolean;
    has_slope_rating: boolean;
    surface?: "results_page";
  };
  reconciliation_applied: {
    scale_factor: number;
    flags: string;
  };
  results_emphasis_impression: {
    emphasized_categories: string;
    surface: "results_page";
  };
  category_detail_interacted: {
    category: StrokesGainedCategory;
    interaction_type: "confidence_badge" | "methodology_tooltip";
    surface: "results_page";
  };
};

type RequiredKeys<T extends object> = {
  [K in keyof T]-?: object extends Pick<T, K> ? never : K;
}[keyof T];

/**
 * Events whose payload has no required fields.
 */
export type OptionalPayloadEvent = {
  [E in AnalyticsEvent]: RequiredKeys<AnalyticsEventProps[E]> extends never
    ? E
    : never;
}[AnalyticsEvent];

/**
 * Events whose payload includes at least one required field.
 */
export type RequiredPayloadEvent = Exclude<AnalyticsEvent, OptionalPayloadEvent>;
