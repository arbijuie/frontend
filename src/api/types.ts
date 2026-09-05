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
export type OpportunitiesResponse = ApiSchemas["OpportunitiesResponse"];

export type ConfigResponse = ApiSchemas["ConfigResponse"];
export type ConfigPresetName = Exclude<NonNullable<_ConfigUpdateRequest["preset"]>, null>;
export type ConfigUpdateRequest = _ConfigUpdateRequest;

export type StatusResponse = ApiSchemas["StatusResponse"];
export type WsAuthTicketResponse = ApiSchemas["WsAuthTicketResponse"];

export const TEST_HYPERLIQUID_TAKER_FEE = 0.035;
export const TEST_LIGHTER_TAKER_FEE = 0.001;
export const TEST_TAKER_FEE_BY_EXCHANGE: Record<string, number> = {
	hyperliquid: TEST_HYPERLIQUID_TAKER_FEE,
	lighter: TEST_LIGHTER_TAKER_FEE,
};
