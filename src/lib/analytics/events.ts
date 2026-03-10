import type { StrokesGainedCategory, StrokesGainedResult } from "@/lib/golf/types";
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
  | "history_link_clicked"
  | "trend_chart_viewed"
  | "biggest_mover_viewed"
  | "auth_modal_opened"
  | "round_detail_viewed"
  | "history_card_clicked"
  | "share_token_created"
  | "share_link_copied"
  | "saved_round_png_downloaded"
  | "shared_saved_round_viewed"
  | "premium_cta_viewed"
  | "premium_cta_clicked"
  | "premium_gate_hit"
  | "checkout_started"
  | "checkout_completed"
  | "billing_portal_opened"
  | "lesson_report_builder_viewed"
  | "lesson_report_selection_changed"
  | "lesson_report_generated"
  | "lesson_report_regenerated"
  | "lesson_report_share_token_created"
  | "lesson_report_share_link_copied"
  | "shared_lesson_report_viewed";

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
    benchmark_interpolation_mode: NonNullable<StrokesGainedResult["benchmarkInterpolationMode"]>;
  };
  plus_handicap_results_viewed: {
    normalized_value: number;
    is_plus_handicap: true;
    benchmark_interpolation_mode: NonNullable<StrokesGainedResult["benchmarkInterpolationMode"]>;
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
  history_link_clicked: { surface: string };
  trend_chart_viewed: { round_count: number };
  biggest_mover_viewed: { category: string; direction: string; confidence: string };
  auth_modal_opened: { surface: string };
  round_detail_viewed: {
    round_id: string;
    methodology_version: string | null;
  };
  history_card_clicked: { round_id: string };
  share_token_created: { round_id: string };
  share_link_copied: { round_id: string; surface: "round_detail" };
  saved_round_png_downloaded: { round_id: string; surface: "round_detail" | "shared_page" };
  shared_saved_round_viewed: { referrer: string };
  premium_cta_viewed: {
    surface: "history_dashboard" | "lesson_prep_builder";
    premium_status: string;
    round_count: number;
  };
  premium_cta_clicked: {
    surface: "history_dashboard" | "lesson_prep_builder";
    premium_status: string;
    round_count: number;
  };
  premium_gate_hit: {
    feature: "lesson_report_generation" | "lesson_report_view";
    surface: "lesson_prep_builder" | "lesson_prep_owner";
    premium_status: string;
    round_count?: number;
  };
  checkout_started: { surface: "lesson_prep_builder" };
  checkout_completed: { surface: "lesson_prep_builder" };
  billing_portal_opened: { surface: "lesson_prep_builder" | "lesson_report_owner" };
  lesson_report_builder_viewed: { round_count: number; premium_status: string };
  lesson_report_selection_changed: { selected_count: number };
  lesson_report_generated: { round_count: number };
  lesson_report_regenerated: { round_count: number };
  lesson_report_share_token_created: { report_id: string };
  lesson_report_share_link_copied: {
    report_id: string;
    surface: "lesson_report_owner";
  };
  shared_lesson_report_viewed: { referrer: string };
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
