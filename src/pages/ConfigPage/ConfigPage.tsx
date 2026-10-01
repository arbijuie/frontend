import { useMemo, useState } from "react";
import layoutStyles from "../../pages/OpportunitiesPage/OpportunitiesPage.module.scss";
import pageStyles from "./ConfigPage.module.scss";
import { useConfig } from "../../hooks/useConfig";
import { useUpdateConfig } from "../../hooks/useUpdateConfig";
import PresetComparison from "../../components/PresetComparison/PresetComparison";
import ConfigAccordion from "../../components/ConfigAccordion/ConfigAccordion";
import ConfigDiffPreview from "../../components/ConfigDiffPreview/ConfigDiffPreview";
import {
  type Draft,
  editableFieldsFromConfig,
  buildDraftFromConfig,
  buildDraftFromPreset,
  buildDiffRows,
  buildPatchPayload,
  detectConflicts,
  hasInvalidDraftValues,
} from "../../lib/configDraft";
import type { ConfigResponse } from "../../api/types";
import { usePageTitle } from "../../hooks/usePageTitle";
import { POLL_INTERVAL_MS } from "../../api/config";
import HelpTooltip from "../../components/HelpTooltip/HelpTooltip";

const FIELD_LABELS: Record<string, string> = {
  min_score_bps: "Min Score (bps)",
  min_volume_24h: "Min Volume 24h ($)",
  min_open_interest: "Min Open Interest ($)",
  min_persistence_hours: "Min Persistence (h)",
  expected_hold_hours: "Expected Hold (h)",
  default_order_size_usd: "Default Order Size ($)",
  max_entry_slippage_bps: "Max Entry Slippage (bps)",
  portfolio_usd: "Portfolio ($)",
  max_position_pct: "Max Position Pct",
  max_volume_fraction: "Max Volume Fraction",
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
  max_entry_adl_level: "Max Entry ADL Level",
  require_isolated_margin: "Require Isolated Margin",
  allow_unknown_margin_mode: "Allow Unknown Margin Mode",
  correlation_threshold: "Correlation Threshold",
  max_correlated_positions: "Max Correlated Positions",
  migration_nautilus_enabled: "Nautilus Migration Enabled",
  migration_nautilus_compare_enabled: "Nautilus Compare Mode",
  migration_nautilus_observe_only: "Nautilus Observe-Only",
  migration_nautilus_adapter_enabled: "Nautilus Pilot Adapter",
  basis_entry_bps: "Basis Entry Threshold (bps)",
  basis_exit_bps: "Basis Exit Threshold (bps)",
  basis_max_hold_multiplier: "Basis Max Hold Multiplier",
  basis_funding_penalty_weight: "Basis Funding Penalty Weight",
  cash_and_carry_entry_bps: "Cash & Carry Entry Threshold (bps)",
  borrow_rate_apr: "Borrow Rate APR (%)",
  lending_yield_apr: "Lending Yield APR (%)",
};

const FIELD_GROUPS: { title: string; fields: string[] }[] = [
  {
    title: "Screener Filters",
    fields: ["min_score_bps", "min_volume_24h", "min_open_interest", "min_persistence_hours"],
  },
  {
    title: "Anti-Churn",
    fields: ["anti_churn_cooldown_s", "anti_churn_score_multiplier"],
  },
  {
    title: "Scoring Model",
    fields: [
      "expected_hold_hours",
      "basis_weight",
      "basis_bonus_cap_bps",
      "basis_divergence_threshold_bps",
      "max_basis_divergence_hours",
      "basis_expansion_penalty_bps_per_hour",
      "hold_window_instability_scale",
      "max_reasonable_apr",
      "max_entry_adl_level",
      "require_isolated_margin",
      "allow_unknown_margin_mode",
      "correlation_threshold",
      "max_correlated_positions",
    ],
  },
  {
    title: "Runtime",
    fields: [
      "default_order_size_usd",
      "max_entry_slippage_bps",
      "portfolio_usd",
      "max_position_pct",
      "max_volume_fraction",
      "stale_data_s",
    ],
  },
  {
    title: "Nautilus Migration",
    fields: [
      "migration_nautilus_enabled",
      "migration_nautilus_compare_enabled",
      "migration_nautilus_observe_only",
      "migration_nautilus_adapter_enabled",
    ],
  },
];

const CONFIG_FIELD_HELP: Record<string, string> = {
  migration_nautilus_enabled:
    "Master switch for Nautilus migration staging controls. Must be true before any dependent migration flag can be enabled.",
  migration_nautilus_compare_enabled:
    "Enables shadow-compare checks against Nautilus. Only takes effect when migration mode is shadow_compare.",
  migration_nautilus_observe_only:
    "Enforces observe-only posture for the migration. Must stay true in the current phase — the server will reject turning this off.",
  migration_nautilus_adapter_enabled:
    "Enables the Phase D pilot adapter path. Requires migration_nautilus_enabled=true and migration mode=nautilus_primary — the server rejects this otherwise.",
};

function groupEditableFields(editableFields: string[]) {
  const categorized = new Set(FIELD_GROUPS.flatMap((g) => g.fields));
  const uncategorized = editableFields.filter((f) => !categorized.has(f));
  const groups = FIELD_GROUPS.map((group) => ({
    title: group.title,
    fields: group.fields.filter((f) => editableFields.includes(f)),
  })).filter((group) => group.fields.length > 0);

  if (uncategorized.length > 0) {
    groups.push({ title: "Other", fields: uncategorized });
  }
  return groups;
}

const ConfigPage = () => {
  usePageTitle("Config");

  const [draftOverrides, setDraftOverrides] = useState<Partial<Draft>>({});
  const [baselineConfig, setBaselineConfig] = useState<ConfigResponse | null>(null);
  const [persist, setPersist] = useState(true);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [applyingPresetKey, setApplyingPresetKey] = useState<string | null>(null);

  const hasDraft = Object.keys(draftOverrides).length > 0;

  const { data, error, loading, fetching, refetch } = useConfig({
    staleTime: hasDraft ? 0 : Infinity,
    refetchInterval: hasDraft ? POLL_INTERVAL_MS : undefined,
  });
  const updateConfig = useUpdateConfig();

  const editableFields = useMemo(() => (data ? editableFieldsFromConfig(data) : []), [data]);
  const fieldGroups = useMemo(() => groupEditableFields(editableFields), [editableFields]);

  const draft: Draft | null = data
    ? (Object.fromEntries(
        Object.entries({
          ...buildDraftFromConfig(data, editableFields),
          ...draftOverrides,
        }).filter(([, value]) => value !== undefined)
      ) as Draft)
    : null;

  const diffRows = data && draft ? buildDiffRows(draft, data, editableFields) : [];
  const invalidFields = draft ? hasInvalidDraftValues(draft, editableFields) : [];
  const conflicts =
    data && baselineConfig ? detectConflicts(baselineConfig, data, editableFields) : [];

  const presetKeys = data ? Object.keys(data.runbook_presets) : [];

  const startEditingIfNeeded = () => {
    if (!baselineConfig && data) {
      setBaselineConfig(data);
    }
  };

  const setFieldOverride = (field: string, value: string | boolean) => {
    startEditingIfNeeded();
    setDraftOverrides((prev) => ({ ...prev, [field]: value }));
    setPreviewOpen(false);
  };

  const onResetDraft = () => {
    setDraftOverrides({});
    setBaselineConfig(null);
    setPreviewOpen(false);
    setLocalError(null);
    setHint("Draft reset to live config");
  };

  const onRevertToPreset = (presetKey: string) => {
    if (!data) return;
    startEditingIfNeeded();
    const presetValues = data.runbook_presets[presetKey];
    const newDraft = buildDraftFromPreset(presetValues, editableFields, data);
    setDraftOverrides(newDraft);
    setPreviewOpen(false);
    setLocalError(null);
    setHint(`Draft loaded from "${presetKey}" preset — review and save to apply`);
  };

  const onOpenPreview = () => {
    if (invalidFields.length > 0) {
      setLocalError(
        `Invalid value for: ${invalidFields.map((f) => FIELD_LABELS[f] ?? f).join(", ")}`
      );
      return;
    }
    if (diffRows.length === 0) {
      setHint("No changes to save");
      return;
    }
    setLocalError(null);
    setHint(null);
    setPreviewOpen(true);
  };

  const onConfirmSave = async () => {
    if (!data || !draft) return;
    setLocalError(null);
    try {
      const payload = buildPatchPayload(draft, data, editableFields, persist);
      await updateConfig.mutateAsync(payload);
      setDraftOverrides({});
      setBaselineConfig(null);
      setPreviewOpen(false);
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

      {conflicts.length > 0 && (
        <div className={pageStyles.conflictBanner} role="alert">
          <strong>Live config changed while you were editing:</strong>{" "}
          {conflicts.map((f) => FIELD_LABELS[f] ?? f).join(", ")}.{" "}
          <button type="button" className={pageStyles.conflictButton} onClick={onResetDraft}>
            Reload draft from live config
          </button>
        </div>
      )}

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
                  setDraftOverrides({});
                  setBaselineConfig(null);
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
          <p className={pageStyles.editorIntro}>
            Edit values below, then preview the exact changes before saving. Uncheck "Persist" to
            apply changes for this session only, without writing to <code>.env</code>.
          </p>
          {draft && (
            <div className={pageStyles.editorCard}>
              {fieldGroups.map((group) => (
                <div key={group.title} className={pageStyles.fieldGroup}>
                  <div className={pageStyles.groupLabel}>{group.title}</div>
                  <div className={pageStyles.grid}>
                    {group.fields.map((field) => {
                      const value = draft[field];
                      const isBoolean = typeof value === "boolean";
                      return (
                        <label
                          key={field}
                          className={isBoolean ? pageStyles.booleanField : pageStyles.field}
                        >
                          {isBoolean && (
                            <input
                              type="checkbox"
                              checked={value as boolean}
                              onChange={(e) => setFieldOverride(field, e.target.checked)}
                            />
                          )}
                          <span className={pageStyles.label}>
                            {FIELD_LABELS[field] ?? field}
                            {CONFIG_FIELD_HELP[field] && (
                              <HelpTooltip
                                label={FIELD_LABELS[field] ?? field}
                                text={CONFIG_FIELD_HELP[field]}
                              />
                            )}
                          </span>
                          {!isBoolean && (
                            <input
                              className={pageStyles.input}
                              type="number"
                              step="any"
                              value={value as string}
                              onChange={(e) => setFieldOverride(field, e.target.value)}
                            />
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}

              <div className={pageStyles.persistToggle}>
                <label>
                  <input
                    type="checkbox"
                    checked={persist}
                    onChange={(e) => setPersist(e.target.checked)}
                  />{" "}
                  Persist to .env (uncheck for session-only changes)
                </label>
              </div>

              {presetKeys.length > 0 && (
                <div className={pageStyles.revertRow}>
                  <span className={pageStyles.revertLabel}>Revert draft to preset:</span>
                  {presetKeys.map((key) => (
                    <button
                      key={key}
                      type="button"
                      className={pageStyles.buttonSecondary}
                      onClick={() => onRevertToPreset(key)}
                      disabled={updateConfig.isPending}
                    >
                      {key}
                    </button>
                  ))}
                </div>
              )}

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
                  onClick={onOpenPreview}
                  disabled={updateConfig.isPending}
                >
                  Preview changes ({diffRows.length})
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

              {previewOpen && (
                <ConfigDiffPreview
                  rows={diffRows}
                  persist={persist}
                  fieldLabels={FIELD_LABELS}
                  onConfirm={() => void onConfirmSave()}
                  onCancel={() => setPreviewOpen(false)}
                  submitting={updateConfig.isPending}
                />
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ConfigPage;
