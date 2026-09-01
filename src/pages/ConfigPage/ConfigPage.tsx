import { useMemo, useState } from "react";
import layoutStyles from "../../pages/OpportunitiesPage/OpportunitiesPage.module.scss";
import pageStyles from "./ConfigPage.module.scss";
import { useConfig } from "../../hooks/useConfig";
import { useUpdateConfig } from "../../hooks/useUpdateConfig";
import PresetComparison from "../../components/PresetComparison/PresetComparison";
import ConfigAccordion from "../../components/ConfigAccordion/ConfigAccordion";
import {
  EDITABLE_CONFIG_FIELDS,
  type EditableConfigField,
  type Preset,
} from "../../lib/presets";
import type { ConfigResponse, ConfigUpdateRequest } from "../../api/types";

const FIELD_LABELS: Record<EditableConfigField, string> = {
  min_score_bps: "Min Score (bps)",
  min_volume_24h: "Min Volume 24h ($)",
  min_open_interest: "Min Open Interest ($)",
  min_persistence_hours: "Min Persistence (h)",
  expected_hold_hours: "Expected Hold (h)",
  default_order_size_usd: "Default Order Size ($)",
  basis_weight: "Basis Weight",
  stale_data_s: "Stale Data Threshold (s)",
  anti_churn_cooldown_s: "Anti-Churn Cooldown (s)",
  anti_churn_score_multiplier: "Anti-Churn Score Multiplier",
  max_reasonable_apr: "Max Funding Diff APR (%)",
};

function toDraft(config: ConfigResponse): Record<EditableConfigField, string> {
  return {
    min_score_bps: String(config.min_score_bps),
    min_volume_24h: String(config.min_volume_24h),
    min_open_interest: String(config.min_open_interest),
    min_persistence_hours: String(config.min_persistence_hours),
    expected_hold_hours: String(config.expected_hold_hours),
    default_order_size_usd: String(config.default_order_size_usd),
    basis_weight: String(config.basis_weight),
    stale_data_s: String(config.stale_data_s),
    anti_churn_cooldown_s: String(config.anti_churn_cooldown_s),
    anti_churn_score_multiplier: String(config.anti_churn_score_multiplier),
    max_reasonable_apr: String(config.max_reasonable_apr),
  };
}

const ConfigPage = () => {
  const { data, error, loading, fetching, refetch } = useConfig();
  const updateConfig = useUpdateConfig();
  const [overrides, setOverrides] = useState<Partial<Record<EditableConfigField, string>>>({});
  const [requireRealDepthOverride, setRequireRealDepthOverride] = useState<boolean | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [applyingPresetKey, setApplyingPresetKey] = useState<string | null>(null);

  const draft = data
    ? ({ ...toDraft(data), ...overrides } as Record<EditableConfigField, string>)
    : null;

  const changedFields = useMemo(() => {
    if (!data) {
      return [] as EditableConfigField[];
    }
    return EDITABLE_CONFIG_FIELDS.filter((field) => {
      const parsed = Number((overrides[field] ?? String(data[field])).trim());
      return Number.isFinite(parsed) && parsed !== data[field];
    });
  }, [data, overrides]);

  const requireRealDepthDraft = requireRealDepthOverride ?? data?.require_real_depth ?? true;
  const requireRealDepthChanged = data
    ? requireRealDepthDraft !== data.require_real_depth
    : false;

  const onApplyPreset = async (preset: Preset) => {
    setLocalError(null);
    setHint(null);
    setApplyingPresetKey(preset.key);
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
  };

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

    const parsed: Partial<Record<EditableConfigField, number>> = {};
    for (const field of EDITABLE_CONFIG_FIELDS) {
      const next = Number(draft[field]);
      if (!Number.isFinite(next)) {
        setLocalError(`Invalid number for ${FIELD_LABELS[field]}`);
        setHint(null);
        return;
      }
      if (next !== data[field]) {
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
      const payload: ConfigUpdateRequest = { ...parsed, persist: true };
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

      {data && (
        <>
          <h2 className={layoutStyles.sectionTitle}>Live Configuration</h2>
          <ConfigAccordion config={data} />

          <h2 className={layoutStyles.sectionTitle}>Presets</h2>
          <PresetComparison
            config={data}
            onApplyPreset={onApplyPreset}
            applyingPresetKey={applyingPresetKey}
          />

          <h2 className={layoutStyles.sectionTitle}>Custom Runbook Fields</h2>
          {draft && (
            <div className={pageStyles.editorCard}>
              <div className={pageStyles.grid}>
                {EDITABLE_CONFIG_FIELDS.map((field) => (
                  <label key={field} className={pageStyles.field}>
                    <span className={pageStyles.label}>{FIELD_LABELS[field]}</span>
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
