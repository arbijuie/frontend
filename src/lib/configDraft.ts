import type { ConfigResponse, ConfigUpdateRequest } from "../api/types";

export type DraftValue = string | boolean;
export type Draft = Record<string, DraftValue>;

export interface DiffRow {
  field: string;
  oldValue: number | boolean;
  newValue: number | boolean;
}

function configValue(config: ConfigResponse, field: string): unknown {
  return config[field as keyof ConfigResponse];
}

export function editableFieldsFromConfig(config: ConfigResponse): string[] {
  return config.runbook_config_fields.filter((field) => {
    const value = configValue(config, field);
    return typeof value === "number" || typeof value === "boolean";
  });
}

export function buildDraftFromConfig(config: ConfigResponse, fields: string[]): Draft {
  const draft: Draft = {};
  for (const field of fields) {
    const value = configValue(config, field);
    draft[field] = typeof value === "boolean" ? value : String(value);
  }
  return draft;
}

export function buildDraftFromPreset(
  presetValues: Record<string, string | number | boolean>,
  fields: string[],
  liveConfig: ConfigResponse
): Draft {
  const draft: Draft = {};
  for (const field of fields) {
    const presetValue = presetValues[field];
    const isUsablePresetValue = typeof presetValue === "number" || typeof presetValue === "boolean";

    if (isUsablePresetValue) {
      draft[field] = typeof presetValue === "boolean" ? presetValue : String(presetValue);
    } else {
      const liveValue = configValue(liveConfig, field);
      draft[field] = typeof liveValue === "boolean" ? liveValue : String(liveValue);
    }
  }
  return draft;
}

function parseDraftValue(raw: DraftValue): { value: number | boolean; valid: boolean } {
  if (typeof raw === "boolean") {
    return { value: raw, valid: true };
  }
  // An empty string must NOT be treated as a valid number: Number("") coerces to 0,
  // which would silently accept a cleared/invalid input as "the user wants zero".
  if (raw.trim() === "") {
    return { value: NaN, valid: false };
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? { value: parsed, valid: true } : { value: NaN, valid: false };
}

export function hasInvalidDraftValues(draft: Draft, fields: string[]): string[] {
  return fields.filter((field) => !parseDraftValue(draft[field]).valid);
}

export function buildDiffRows(
  draft: Draft,
  liveConfig: ConfigResponse,
  fields: string[]
): DiffRow[] {
  const rows: DiffRow[] = [];
  for (const field of fields) {
    const liveValue = configValue(liveConfig, field) as number | boolean;
    const { value, valid } = parseDraftValue(draft[field]);
    if (valid && value !== liveValue) {
      rows.push({ field, oldValue: liveValue, newValue: value });
    }
  }
  return rows;
}

export function buildPatchPayload(
  draft: Draft,
  liveConfig: ConfigResponse,
  fields: string[],
  persist: boolean
): ConfigUpdateRequest {
  const payload: Record<string, unknown> = { persist };
  for (const row of buildDiffRows(draft, liveConfig, fields)) {
    payload[row.field] = row.newValue;
  }
  return payload as ConfigUpdateRequest;
}

export function detectConflicts(
  baseline: ConfigResponse,
  live: ConfigResponse,
  fields: string[]
): string[] {
  return fields.filter((field) => configValue(baseline, field) !== configValue(live, field));
}
