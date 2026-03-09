import type { StrokesGainedCategory } from "@/lib/golf/types";
import type { TroubleCause } from "@/lib/golf/trouble-context";

export type AnalyticsEvent =
  | "landing_cta_clicked"
  | "sample_preview_cta_clicked"
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
  | "category_detail_interacted"
  | "plus_handicap_submitted"
  | "plus_handicap_results_viewed"
  | "trouble_context_prompt_viewed"
  | "trouble_context_prompt_dismissed"
  | "trouble_context_started"
  | "trouble_context_completed"
  | "trouble_context_cause_selected"
  | "trouble_narrative_viewed"
  | "trouble_context_saved_with_round"
  | "trouble_context_save_failed"
  | "trouble_context_removed"
  | "round_claimed"
  | "round_claim_failed"
  | "history_page_viewed"
  | "trend_chart_viewed"
  | "biggest_mover_viewed"
  | "auth_modal_opened";

type EmptyPayload = Record<never, never>;

export type AnalyticsEventProps = {
  landing_cta_clicked: { utm_source?: string };
  sample_preview_cta_clicked: { utm_source?: string };
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
  plus_handicap_submitted: {
    normalized_value: number;
    is_plus_handicap: true;
    benchmark_interpolation_mode: "scratch_clamped";
  };
  plus_handicap_results_viewed: {
    normalized_value: number;
    is_plus_handicap: true;
    benchmark_interpolation_mode: "standard" | "scratch_clamped" | "elite_interpolated" | "elite_clamped";
  };
  trouble_context_prompt_viewed: EmptyPayload;
  trouble_context_prompt_dismissed: EmptyPayload;
  trouble_context_started: EmptyPayload;
  trouble_context_completed: { hole_count: number; causes: TroubleCause[] };
  trouble_context_cause_selected: { cause: TroubleCause; step: number };
  trouble_narrative_viewed: { tee_count: number; total_holes: number };
  trouble_context_saved_with_round: { hole_count: number };
  trouble_context_save_failed: {
    error_type: "config" | "runtime" | "network";
  };
  trouble_context_removed: EmptyPayload;
  round_claimed: EmptyPayload;
  round_claim_failed: { reason: string };
  history_page_viewed: { round_count: number };
  trend_chart_viewed: { round_count: number };
  biggest_mover_viewed: { category: string; direction: string; confidence: string };
  auth_modal_opened: { surface: string };
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
