export type LiquidityTier = 'H' | 'M' | 'L';
export type OpportunityStatus = 'ready' | 'watching' | 'blocked';
export type FundingTrend = 'rising' | 'falling' | 'stable';

export interface FundingForecast {
  expected_apr: number;
  avg_24h_apr: number | null;
  avg_72h_apr: number | null;
  trend: FundingTrend;
  std_apr: number;
  is_unstable: boolean;
}

export interface OpportunityItem {
  symbol: string;
  long_exchange: string;
  short_exchange: string;
  persistence_hours: number | null;
  long_rate_apr: number;
  short_rate_apr: number;
  funding_diff_apr: number;
  funding_edge_bps: number;
  basis_bps: number;
  basis_bonus_bps: number;
  fee_impact_bps: number;
  slippage_impact_bps: number;
  total_cost_bps: number;
  hl_depth_source: 'real' | 'proxy' | 'none';
  lighter_depth_source: 'real' | 'proxy' | 'none';
  effective_hl_taker_fee: number | null;
  effective_lighter_taker_fee: number | null;
  long_hours_to_next_funding: number | null;
  short_hours_to_next_funding: number | null;
  funding_timing_asymmetry_hours: number | null;
  funding_timing_penalty_bps: number;
  min_profitable_hours: number | null;
  hours_to_breakeven: number | null;
  combined_score: number;
  long_forecast: FundingForecast | null;
  short_forecast: FundingForecast | null;
  funding_instability_multiplier: number;
  basis_trend: number | null;
  liquidity_tier: LiquidityTier | null;
  status: OpportunityStatus;
  reasons: string[];
}

export interface OpportunitiesResponse {
  count: number;
  ready_count: number;
  updated_at: string | null;
  opportunities: OpportunityItem[];
}

export interface ConfigResponse {
  api_host: string;
  api_port: number;
  min_score_bps: number;
  min_volume_24h: number;
  min_open_interest: number;
  min_persistence_hours: number;
  anti_churn_cooldown_s: number;
  anti_churn_score_multiplier: number;
  hl_fee_per_side: number;
  lighter_fee_per_side: number;
  default_order_size_usd: number;
  slippage_volume_depth_ratio: number;
  require_real_depth: boolean;
  expected_hold_hours: number;
  basis_weight: number;
  liquidity_weight: number;
  timing_penalty_bps_per_hour: number;
  max_funding_timing_asymmetry_hours: number;
  max_basis_bps: number;
  max_basis_trend_bps_per_tick: number;
  funding_ema_span_hours: number;
  funding_avg_short_hours: number;
  funding_avg_long_hours: number;
  funding_instability_threshold: number;
  funding_instability_min_std_apr: number;
  funding_instability_multiplier: number;
  loop_interval_s: number;
  stale_data_s: number;
  exec_enabled: boolean;
  exec_dry_run: boolean;
  exec_stop_on_consecutive_rollbacks: number;
  exec_stop_on_api_errors_per_window: number;
  exec_api_error_window_s: number;
  exec_stop_on_median_slippage_bps: number;
  exec_slippage_sample_size: number;
  exec_stop_on_stale_data_s: number;
  exec_margin_alert_pct: number;
  exec_margin_force_close_pct: number;
  exec_adl_warn_quantile: number;
  exec_adl_critical_quantile: number;
  exec_recovery_cooldown_s: number;
  exec_recovery_require_manual_ack: boolean;
}

export type ConfigPresetName = 'conservative' | 'balanced' | 'aggressive';

export interface ConfigUpdateRequest {
  preset?: ConfigPresetName;
  persist?: boolean;
  min_score_bps?: number;
  min_volume_24h?: number;
  min_open_interest?: number;
  min_persistence_hours?: number;
  expected_hold_hours?: number;
  basis_weight?: number;
  stale_data_s?: number;
  anti_churn_cooldown_s?: number;
  anti_churn_score_multiplier?: number;
}

export interface StatusResponse {
  uptime_s: number;
  started_at: string;
  last_updated_at: string | null;
  last_poll_started_at: string | null;
  last_poll_finished_at: string | null;
  last_poll_duration_ms: number | null;
  poll_count_total: number;
  poll_count_success: number;
  poll_count_failed: number;
  exchange_last_ok: Record<string, boolean>;
}

export interface WsAuthTicketResponse {
  ticket: string;
  expires_at: string;
  ttl_s: number;
}
