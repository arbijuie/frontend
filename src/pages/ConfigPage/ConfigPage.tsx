import { useMemo, useState } from "react";
import layoutStyles from "../../pages/OpportunitiesPage/OpportunitiesPage.module.scss";
import pageStyles from "./ConfigPage.module.scss";
import { useConfig } from "../../hooks/useConfig";
import { useUpdateConfig } from "../../hooks/useUpdateConfig";
import PresetComparison from "../../components/PresetComparison/PresetComparison";
import ConfigAccordion from "../../components/ConfigAccordion/ConfigAccordion";
import { type EditableConfigField } from "../../lib/presets";
import type { ConfigResponse, ConfigUpdateRequest } from "../../api/types";

const FIELD_LABELS: Record<string, string> = {
  min_score_bps: "Min Score (bps)",
  min_volume_24h: "Min Volume 24h ($)",
  min_open_interest: "Min Open Interest ($)",
  min_persistence_hours: "Min Persistence (h)",
  expected_hold_hours: "Expected Hold (h)",
  default_order_size_usd: "Default Order Size ($)",
  real_depth_proxy_floor_ratio: "Real-Depth Proxy Floor Ratio",
  basis_weight: "Basis Weight",
  basis_bonus_cap_bps: "Basis Bonus Cap (bps)",
  basis_divergence_threshold_bps: "Basis Divergence Threshold (bps)",
  max_basis_divergence_hours: "Max Basis Divergence Hours",
  basis_expansion_penalty_bps_per_hour: "Basis Expansion Penalty (bps/h)",
  hold_window_instability_scale: "Hold Window Instability Scale",
  stale_data_s: "Stale Data Threshold (s)",
  anti_churn_cooldown_s: "Anti-Churn Cooldown (s)",
  anti_churn_score_multiplier: "Anti-Churn Score Multiplier",
  max_reasonable_apr: "Max Funding Diff APR (%)",
};

function toDraft(
  config: ConfigResponse,
  editableNumericFields: EditableConfigField[]
): Record<EditableConfigField, string> {
  const draft: Record<EditableConfigField, string> = {};
  for (const field of editableNumericFields) {
    draft[field] = String(config[field as keyof ConfigResponse]);
  }
  return draft;
}

function numericConfigValue(config: ConfigResponse, field: string): number {
  const value = config[field as keyof ConfigResponse];
  return typeof value === "number" ? value : Number.NaN;
}

const ConfigPage = () => {
  const { data, error, loading, fetching, refetch } = useConfig();
  const updateConfig = useUpdateConfig();
  const [overrides, setOverrides] = useState<Partial<Record<EditableConfigField, string>>>({});
  const [requireRealDepthOverride, setRequireRealDepthOverride] = useState<boolean | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [applyingPresetKey, setApplyingPresetKey] = useState<string | null>(null);
  const editableNumericFields = useMemo(() => {
    if (!data) {
      return [] as EditableConfigField[];
    }
    return data.runbook_config_fields.filter((field) => {
      if (field === "require_real_depth") {
        return false;
      }
      const value = data[field as keyof ConfigResponse];
      return typeof value === "number";
    });
  }, [data]);

  const draft = data
    ? ({
        ...toDraft(data, editableNumericFields),
        ...overrides,
      } as Record<EditableConfigField, string>)
    : null;

  const changedFields = useMemo(() => {
    if (!data) {
      return [] as EditableConfigField[];
    }
    return editableNumericFields.filter((field) => {
      const liveValue = numericConfigValue(data, field);
      const parsed = Number((overrides[field] ?? String(liveValue)).trim());
      return Number.isFinite(parsed) && parsed !== liveValue;
    });
  }, [data, editableNumericFields, overrides]);

  const requireRealDepthDraft = requireRealDepthOverride ?? data?.require_real_depth ?? true;
  const requireRealDepthChanged = data
    ? requireRealDepthDraft !== data.require_real_depth
    : false;

  const onResetDraft = () => {
    if (!data) {
      return;
    }
    setOverrides({});
    setRequireRealDepthOverride(null);
    setLocalError(null);
    setHint("Draft reset to live config");
  };

  const onSaveDraft = async () => {
    if (!data || !draft) {
      return;
    }

    const parsed: Record<string, number> = {};
    for (const field of editableNumericFields) {
      const next = Number(draft[field]);
      if (!Number.isFinite(next)) {
        setLocalError(`Invalid number for ${FIELD_LABELS[field] ?? field}`);
        setHint(null);
        return;
      }
      if (next !== numericConfigValue(data, field)) {
        parsed[field] = next;
      }
    }

    if (Object.keys(parsed).length === 0 && !requireRealDepthChanged) {
      setHint("No changes to save");
      setLocalError(null);
      return;
    }

    setLocalError(null);
    setHint(null);
    try {
      const payload: ConfigUpdateRequest = { persist: true };
      Object.assign(payload as Record<string, number>, parsed);
      if (requireRealDepthChanged) {
        payload.require_real_depth = requireRealDepthDraft;
      }
      await updateConfig.mutateAsync(payload);
      setOverrides({});
      setRequireRealDepthOverride(null);
      setHint("Config updated");
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : "Failed to update config");
    }
  };

  return (
    <div className={layoutStyles.page}>
      <h1 className={layoutStyles.title}>Config</h1>

      {error && <div className={layoutStyles.errorBox}>Error: {error}</div>}
      {localError && <div className={layoutStyles.errorBox}>Error: {localError}</div>}
      {loading && !data && <div>Loading config...</div>}
      {hint && <div className={layoutStyles.hint}>{hint}</div>}
      <div className={pageStyles.deprecationNote}>
        Fee aliases are compatibility-only for this release and will be removed in the next
        release. Use taker/maker fee fields as the canonical contract.
      </div>

      {data && (
        <>
          <h2 className={layoutStyles.sectionTitle}>Live Configuration</h2>
          <ConfigAccordion config={data} />

          <h2 className={layoutStyles.sectionTitle}>Presets</h2>
          <PresetComparison
            config={data}
            onApplyPreset={(preset) => {
              setLocalError(null);
              setHint(null);
              setApplyingPresetKey(preset.key);
              void (async () => {
                try {
                  await updateConfig.mutateAsync({ preset: preset.key, persist: true });
                  setOverrides({});
                  setRequireRealDepthOverride(null);
                  setHint(`${preset.name} preset applied`);
                } catch (e) {
                  setLocalError(e instanceof Error ? e.message : "Failed to apply preset");
                } finally {
                  setApplyingPresetKey(null);
                }
              })();
            }}
            applyingPresetKey={applyingPresetKey}
            disableAll={updateConfig.isPending}
          />

          <h2 className={layoutStyles.sectionTitle}>Custom Runbook Fields</h2>
          {draft && (
            <div className={pageStyles.editorCard}>
              <div className={pageStyles.grid}>
                {editableNumericFields.map((field) => (
                  <label key={field} className={pageStyles.field}>
                    <span className={pageStyles.label}>{FIELD_LABELS[field] ?? field}</span>
                    <input
                      className={pageStyles.input}
                      type="number"
                      step="any"
                      value={draft[field]}
                      onChange={(e) =>
                        setOverrides((prev) => ({
                          ...prev,
                          [field]: e.target.value,
                        }))
                      }
                    />
                  </label>
                ))}
                <label className={pageStyles.toggleField}>
                  <input
                    type="checkbox"
                    checked={requireRealDepthDraft}
                    onChange={(e) => setRequireRealDepthOverride(e.target.checked)}
                  />
                  <span className={pageStyles.label}>Require Real Depth</span>
                </label>
              </div>
              <div className={pageStyles.actions}>
                <button
                  type="button"
                  className={pageStyles.buttonSecondary}
                  onClick={onResetDraft}
                  disabled={updateConfig.isPending}
                >
                  Reset
                </button>
                <button
                  type="button"
                  className={pageStyles.buttonPrimary}
                  onClick={onSaveDraft}
                  disabled={updateConfig.isPending}
                >
                  {updateConfig.isPending
                    ? "Saving..."
                    : `Save (${changedFields.length + (requireRealDepthChanged ? 1 : 0)})`}
                </button>
                <button
                  type="button"
                  className={pageStyles.buttonSecondary}
                  onClick={() => void refetch()}
                  disabled={fetching || updateConfig.isPending}
                >
                  Refresh Live
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ConfigPage;
