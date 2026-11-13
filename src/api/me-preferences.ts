import { API_URL, authFetch } from "./config";
import { parseApiError } from "../lib/api-errors";
import type { components } from "./generated/openapi";

type ApiSchemas = components["schemas"];
type ApiMePreferencesResponse = ApiSchemas["UserPreferencesResponse"];

export type RunbookPreferenceValue = NonNullable<
  ApiMePreferencesResponse["runbook_overrides"]
>[string];

export type TutorialPreferences = ApiSchemas["TutorialPreferences"];

export type MePreferencesResponse = Omit<
  ApiMePreferencesResponse,
  | "selected_preset"
  | "runbook_overrides"
  | "effective_runbook_values"
  | "runbook_config_fields"
  | "runbook_presets"
  | "tutorial"
  | "updated_at"
  | "invalid_profile"
> & {
  selected_preset: Exclude<ApiMePreferencesResponse["selected_preset"], undefined>;
  runbook_overrides: NonNullable<ApiMePreferencesResponse["runbook_overrides"]>;
  effective_runbook_values: NonNullable<ApiMePreferencesResponse["effective_runbook_values"]>;
  runbook_config_fields: NonNullable<ApiMePreferencesResponse["runbook_config_fields"]>;
  runbook_presets: NonNullable<ApiMePreferencesResponse["runbook_presets"]>;
  tutorial: NonNullable<ApiMePreferencesResponse["tutorial"]>;
  updated_at: Exclude<ApiMePreferencesResponse["updated_at"], undefined>;
  invalid_profile?: Exclude<ApiMePreferencesResponse["invalid_profile"], undefined>;
};

export type TutorialPreferencesUpdateRequest = NonNullable<
  ApiSchemas["UserPreferencesUpdateRequest"]["tutorial"]
>;

export type MePreferencesUpdateRequest = ApiSchemas["UserPreferencesUpdateRequest"];

export async function fetchMePreferences(): Promise<MePreferencesResponse> {
  const res = await authFetch(`${API_URL}/me/preferences`);
  if (!res.ok) throw await parseApiError(res);
  return res.json();
}

export async function patchMePreferences(
  payload: MePreferencesUpdateRequest
): Promise<MePreferencesResponse> {
  const res = await authFetch(`${API_URL}/me/preferences`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await parseApiError(res);
  return res.json();
}
