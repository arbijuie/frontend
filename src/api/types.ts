import type { components } from "./generated/openapi";

type ApiSchemas = components["schemas"];

type _OpportunityItem = ApiSchemas["OpportunityItem"];
type _FundingForecastItem = ApiSchemas["FundingForecastItem"];
type _ConfigUpdateRequest = ApiSchemas["ConfigUpdateRequest"];

export type LiquidityTier = NonNullable<_OpportunityItem["liquidity_tier"]>;
export type DepthQuality = NonNullable<_OpportunityItem["depth_quality"]>;
export type OpportunityStatus = _OpportunityItem["status"];
export type FundingTrend = _FundingForecastItem["trend"];
export type OpportunityReasonSeverity = ApiSchemas["ReasonItem"]["severity"];
export type OpportunityReasonCode = ApiSchemas["ReasonCode"];

export type OpportunityReason = ApiSchemas["ReasonItem"];
export type FundingForecast = _FundingForecastItem;
export type OpportunityItem = _OpportunityItem;
export type OpportunityStrategyType = NonNullable<OpportunityItem["strategy_type"]>;
export type OpportunitiesResponse = ApiSchemas["OpportunitiesResponse"];
export type SourceState = NonNullable<
  NonNullable<OpportunityItem["microstructure_by_exchange"]>[string]
>["price_source"];
export const SOURCE_STATE_SET: Record<SourceState, true> = {
  real_ws: true,
  real_rest: true,
  derived: true,
  config: true,
  unavailable: true,
};

export type ConfigResponse = ApiSchemas["ConfigResponse"];
export type ConfigPresetName = Exclude<NonNullable<_ConfigUpdateRequest["preset"]>, null>;
export type ConfigUpdateRequest = _ConfigUpdateRequest;

export type StatusResponse = ApiSchemas["StatusResponse"];
export type WsAuthTicketResponse = ApiSchemas["WsAuthTicketResponse"];
export type TelegramSessionResponse = ApiSchemas["TelegramSessionResponse"];
export type CorrelationResponse = ApiSchemas["CorrelationResponse"];
export type ExecutionPreflightResponse = ApiSchemas["ExecutionPreflightResponse"];

export type BacktestSummaryResponse = components["schemas"]["BacktestSummaryResponse"];
export type BacktestReplayRequest = components["schemas"]["BacktestReplayRequest"];
export type BacktestReplayResponse = components["schemas"]["BacktestReplayResponse"];
export type BacktestMetrics = components["schemas"]["BacktestMetricsItem"];
export type ReplaySourceDiagnostics = components["schemas"]["ReplaySourceDiagnosticsItem"];
export type ReplaySourceSymbolCoverage = components["schemas"]["ReplaySourceSymbolCoverageItem"];
export type ReplaySourceKind = NonNullable<BacktestReplayResponse["replay_source"]>;
export type BacktestLock = components["schemas"]["BacktestLockResponse"];
export type BacktestLockListItem = components["schemas"]["BacktestLockListItem"];
export type BacktestLockListResponse = components["schemas"]["BacktestLockListResponse"];
export type BacktestGateResponse = components["schemas"]["BacktestGateResponse"];

export const TEST_HYPERLIQUID_TAKER_FEE = 0.035;
export const TEST_LIGHTER_TAKER_FEE = 0.001;
export const TEST_TAKER_FEE_BY_EXCHANGE: Record<string, number> = {
  hyperliquid: TEST_HYPERLIQUID_TAKER_FEE,
  lighter: TEST_LIGHTER_TAKER_FEE,
};

export type AutomationOverviewResponse = ApiSchemas["AutomationOverviewResponse"];
export type AutomationModeItem = ApiSchemas["AutomationModeItem"];
export type AutomationControlRequest = ApiSchemas["AutomationControlRequest"];

// Redacted public projections (issues #304, #305): read-only DTOs for the public pages.
export type PublicStatusResponse = ApiSchemas["PublicStatusResponse"];
export type PublicExchangeStatus = ApiSchemas["PublicExchangeStatusItem"];
export type PublicOpportunitiesResponse = ApiSchemas["PublicOpportunitiesResponse"];
export type PublicOpportunityItem = ApiSchemas["PublicOpportunityItem"];
export type PublicCorrelationResponse = ApiSchemas["PublicCorrelationResponse"];
export type PublicJournalResponse = ApiSchemas["PublicJournalResponse"];
export type PublicJournalDay = ApiSchemas["PublicJournalDay"];
export type PublicJournalCounters = ApiSchemas["PublicJournalCounters"];

// Operator surfaces for existing API capabilities (issues #507 to #514).
export type ExecutionAttemptItem = ApiSchemas["ExecutionAttemptItem"];
export type ExecutionAttemptListResponse = ApiSchemas["ExecutionAttemptListResponse"];
export type ExecutionOpenRequest = ApiSchemas["ExecutionOpenRequest"];
export type ExecutionCloseRequest = ApiSchemas["ExecutionCloseRequest"];
export type PositionsResponse = ApiSchemas["PositionsResponse"];
export type PositionSnapshotItem = ApiSchemas["PositionSnapshotItem"];
export type DailyPnlResponse = ApiSchemas["DailyPnlResponse"];
export type DailyPnlItem = ApiSchemas["DailyPnlItem"];
export type AutoEntryDecisionItem = ApiSchemas["AutoEntryDecisionItem"];
export type AutoExitDecisionItem = ApiSchemas["AutoExitDecisionItem"];
export type AutoEntryDecisionListResponse = ApiSchemas["AutoEntryDecisionListResponse"];
export type AutoExitDecisionListResponse = ApiSchemas["AutoExitDecisionListResponse"];
export type RiskGuardrailsResponse = ApiSchemas["RiskGuardrailsResponse"];
export type GuardrailDecisionItem = ApiSchemas["GuardrailDecisionItem"];
export type MigrationParityArtifactItem = ApiSchemas["MigrationParityArtifactItem"];
export type MigrationParityArtifactListResponse = ApiSchemas["MigrationParityArtifactListResponse"];
export type MigrationParityReportResponse = ApiSchemas["MigrationParityReportResponse"];
export type SnapshotContinuityResponse = ApiSchemas["SnapshotContinuityResponse"];
export type BacktestHistoryResponse = ApiSchemas["BacktestHistoryResponse"];
export type BacktestPairHistoryItem = ApiSchemas["BacktestPairHistoryItem"];
export type BacktestSurvivalResponse = ApiSchemas["BacktestSurvivalResponse"];
export type BacktestSurvivalGroupItem = ApiSchemas["BacktestSurvivalGroupItem"];
export type PersistenceForecastResponse = ApiSchemas["PersistenceForecastResponse"];
export type PersistenceForecastItem = ApiSchemas["PersistenceForecastItem"];
