import { useEffect, useId, useMemo, useRef, useState } from "react";
import layoutStyles from "../../pages/OpportunitiesPage/OpportunitiesPage.module.scss";
import pageStyles from "./ConfigPage.module.scss";
import { useConfig } from "../../hooks/useConfig";
import { useUpdateConfig } from "../../hooks/useUpdateConfig";
import { useUpdateMePreferences } from "../../hooks/useUpdateMePreferences";
import { useMePreferences } from "../../hooks/useMePreferences";
import ProductModes from "../../components/ProductModes/ProductModes";
import { modeForPreset } from "../../lib/productModes";
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
import type { MePreferencesUpdateRequest, RunbookPreferenceValue } from "../../api/me-preferences";
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
];

type ProfilePreset = Exclude<MePreferencesUpdateRequest["preset"], undefined>;

const CONFIG_FIELD_HELP: Record<string, string> = {
  allow_unknown_margin_mode:
    "Lets a Hyperliquid leg through when its margin mode cannot be read. Only matters while Require Isolated Margin is on.",
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

function isRunbookPreferenceValue(value: unknown): value is RunbookPreferenceValue {
  return typeof value === "number" || typeof value === "boolean";
}

function buildDraftFromRunbookValues(
  values: Record<string, RunbookPreferenceValue>,
  editableFields: string[]
): Draft {
  const draft: Draft = {};
  for (const field of editableFields) {
    const value = values[field];
    if (typeof value === "boolean") {
      draft[field] = value;
      continue;
    }
    if (typeof value === "number") {
      draft[field] = String(value);
    }
  }
  return draft;
}

function parseDraftPreferenceValue(value: string | boolean): RunbookPreferenceValue | null {
  if (typeof value === "boolean") {
    return value;
  }
  const normalized = value.trim();
  if (normalized.length === 0) {
    return null;
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildRunbookBaseValues(
  config: ConfigResponse,
  editableFields: string[],
  presetValues: Record<string, RunbookPreferenceValue> | null
): Record<string, RunbookPreferenceValue> {
  const baseValues: Record<string, RunbookPreferenceValue> = {};

  for (const field of editableFields) {
    const presetValue = presetValues ? presetValues[field] : undefined;
    if (isRunbookPreferenceValue(presetValue)) {
      baseValues[field] = presetValue;
      continue;
    }
    const raw = config[field as keyof ConfigResponse];
    if (isRunbookPreferenceValue(raw)) {
      baseValues[field] = raw;
    }
  }

  return baseValues;
}

function buildProfileOverridePayload(
  draft: Draft,
  editableFields: string[],
  baseValues: Record<string, RunbookPreferenceValue>
): { overrides: Record<string, RunbookPreferenceValue>; invalidFields: string[] } {
  const overrides: Record<string, RunbookPreferenceValue> = {};
  const invalidFields: string[] = [];

  for (const field of editableFields) {
    const raw = draft[field];
    if (raw === undefined) {
      continue;
    }
    const parsed = parseDraftPreferenceValue(raw);
    if (parsed === null) {
      invalidFields.push(field);
      continue;
    }
    const current = baseValues[field];
    if (current === undefined || typeof current !== typeof parsed || current !== parsed) {
      overrides[field] = parsed;
    }
  }

  return { overrides, invalidFields };
}

const ConfigPage = () => {
  usePageTitle("Settings");
  const baseId = useId();

  const [draftOverrides, setDraftOverrides] = useState<Partial<Draft>>({});
  const [baselineConfig, setBaselineConfig] = useState<ConfigResponse | null>(null);
  const [persist, setPersist] = useState(true);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [applyingPresetKey, setApplyingPresetKey] = useState<string | null>(null);
  const previewButtonRef = useRef<HTMLButtonElement>(null);
  const restoreFocusRef = useRef(false);

  const hasDraft = Object.keys(draftOverrides).length > 0;

  const { data, error, loading, fetching, refetch } = useConfig({
    staleTime: hasDraft ? 0 : Infinity,
    refetchInterval: hasDraft ? POLL_INTERVAL_MS : undefined,
  });
  const updateConfig = useUpdateConfig();

  const {
    data: mePreferences,
    error: mePreferencesError,
    loading: mePreferencesLoading,
    fetching: mePreferencesFetching,
  } = useMePreferences();
  const updateMePreferences = useUpdateMePreferences();

  const [profilePresetDraft, setProfilePresetDraft] = useState<ProfilePreset | undefined>(undefined);
  const [profileDraftOverrides, setProfileDraftOverrides] = useState<Partial<Draft>>({});
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileHint, setProfileHint] = useState<string | null>(null);

  useEffect(() => {
    if (!previewOpen && restoreFocusRef.current && !updateConfig.isPending) {
      restoreFocusRef.current = false;
      previewButtonRef.current?.focus();
    }
  }, [previewOpen, updateConfig.isPending]);

  const editableFields = useMemo(() => (data ? editableFieldsFromConfig(data) : []), [data]);
  const fieldGroups = useMemo(() => groupEditableFields(editableFields), [editableFields]);

  const profileEditableFields = useMemo(
    () =>
      mePreferences
        ? mePreferences.runbook_config_fields.filter((field) =>
            isRunbookPreferenceValue(mePreferences.effective_runbook_values[field])
          )
        : [],
    [mePreferences]
  );
  const profileFieldGroups = useMemo(
    () => groupEditableFields(profileEditableFields),
    [profileEditableFields]
  );
  const savedProfilePreset = mePreferences?.selected_preset ?? null;
  const selectedProfilePreset =
    profilePresetDraft === undefined ? savedProfilePreset : profilePresetDraft;

  const profileBaseValues = useMemo(() => {
    if (!mePreferences) {
      return {} as Record<string, RunbookPreferenceValue>;
    }
    if (!data) {
      return Object.fromEntries(
        profileEditableFields
          .map((field) => [field, mePreferences.effective_runbook_values[field]])
          .filter(([, value]) => isRunbookPreferenceValue(value))
      ) as Record<string, RunbookPreferenceValue>;
    }
    const resolvedPreset =
      profilePresetDraft === undefined ? savedProfilePreset : selectedProfilePreset;
    const presetValues = resolvedPreset ? mePreferences.runbook_presets[resolvedPreset] ?? null : null;
    const baseValues = buildRunbookBaseValues(data, profileEditableFields, presetValues);

    if (profilePresetDraft === undefined) {
      for (const field of profileEditableFields) {
        const overrideValue = mePreferences.runbook_overrides[field];
        if (isRunbookPreferenceValue(overrideValue)) {
          baseValues[field] = overrideValue;
        }
      }
    }

    return baseValues;
  }, [
    data,
    mePreferences,
    profileEditableFields,
    profilePresetDraft,
    savedProfilePreset,
    selectedProfilePreset,
  ]);

  const draft: Draft | null = data
    ? (Object.fromEntries(
        Object.entries({
          ...buildDraftFromConfig(data, editableFields),
          ...draftOverrides,
        }).filter(([, value]) => value !== undefined)
      ) as Draft)
    : null;

  const profileDraft: Draft | null = mePreferences
    ? (Object.fromEntries(
        Object.entries({
          ...buildDraftFromRunbookValues(profileBaseValues, profileEditableFields),
          ...profileDraftOverrides,
        }).filter(([, value]) => value !== undefined)
      ) as Draft)
    : null;

  const diffRows = data && draft ? buildDiffRows(draft, data, editableFields) : [];
  const invalidFields = draft ? hasInvalidDraftValues(draft, editableFields) : [];
  const profileInvalidFields = profileDraft
    ? hasInvalidDraftValues(profileDraft, profileEditableFields)
    : [];
  const conflicts =
    data && baselineConfig ? detectConflicts(baselineConfig, data, editableFields) : [];
  const profilePresetChanged =
    profilePresetDraft !== undefined && profilePresetDraft !== savedProfilePreset;
  const profileOverridesClearedToRuntimeBase =
    profilePresetDraft === null &&
    savedProfilePreset === null &&
    Object.keys(mePreferences?.runbook_overrides ?? {}).length > 0 &&
    Object.keys(profileDraftOverrides).length === 0;
  const profileHasDraft =
    Object.keys(profileDraftOverrides).length > 0 ||
    profilePresetChanged ||
    profileOverridesClearedToRuntimeBase;

  const presetKeys = data ? Object.keys(data.runbook_presets) : [];
  const profilePresetKeys = mePreferences
    ? (Object.keys(mePreferences.runbook_presets) as Array<Exclude<ProfilePreset, null>>)
    : [];

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

  const closePreview = () => {
    restoreFocusRef.current = true;
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
      closePreview();
      setHint("Config updated");
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : "Failed to update config");
    }
  };

  const profileActive = mePreferences
    ? mePreferences.selected_preset !== null || Object.keys(mePreferences.runbook_overrides).length > 0
    : false;
  const profileInvalid = mePreferences?.invalid_profile === true;
  const profileStatusLabel = profileInvalid ? "invalid" : profileActive ? "active" : "inactive";
  const profileSubmitting = updateMePreferences.isPending;

  const setProfileFieldOverride = (field: string, value: string | boolean) => {
    setProfileDraftOverrides((prev) => ({ ...prev, [field]: value }));
    setProfileError(null);
    setProfileHint(null);
  };

  const onResetProfileDraft = () => {
    setProfilePresetDraft(undefined);
    setProfileDraftOverrides({});
    setProfileError(null);
    setProfileHint("Profile draft reset to your current personal settings");
  };

  const onLoadProfilePreset = (presetKey: Exclude<ProfilePreset, null>) => {
    if (!mePreferences) return;
    setProfilePresetDraft(presetKey);
    setProfileError(null);
    if (presetKey === savedProfilePreset) {
      setProfileDraftOverrides(
        buildDraftFromRunbookValues(mePreferences.runbook_overrides, profileEditableFields)
      );
      setProfileHint(`Preset "${presetKey}" loaded with your saved overrides`);
      return;
    }
    setProfileDraftOverrides({});
    setProfileHint(`Preset base set to "${presetKey}" — review and save`);
  };

  const onUseRuntimeBase = () => {
    setProfilePresetDraft(null);
    setProfileDraftOverrides({});
    setProfileError(null);
    setProfileHint("Preset base cleared — using live runtime defaults");
  };

  const onSaveProfile = async () => {
    if (!data || !profileDraft) return;
    if (!profileHasDraft) {
      setProfileHint("No personal changes to save");
      return;
    }
    if (profileInvalidFields.length > 0) {
      setProfileError(
        `Invalid value for: ${profileInvalidFields
          .map((field) => FIELD_LABELS[field] ?? field)
          .join(", ")}`
      );
      return;
    }

    const presetBaseValues = buildRunbookBaseValues(
      data,
      profileEditableFields,
      selectedProfilePreset ? data.runbook_presets[selectedProfilePreset] ?? null : null
    );
    const { overrides, invalidFields: payloadInvalidFields } = buildProfileOverridePayload(
      profileDraft,
      profileEditableFields,
      presetBaseValues
    );

    if (payloadInvalidFields.length > 0) {
      setProfileError(
        `Invalid value for: ${payloadInvalidFields
          .map((field) => FIELD_LABELS[field] ?? field)
          .join(", ")}`
      );
      return;
    }

    try {
      await updateMePreferences.mutateAsync({
        preset: selectedProfilePreset,
        runbook_overrides: overrides,
      });
      setProfilePresetDraft(undefined);
      setProfileDraftOverrides({});
      setProfileError(null);
      setProfileHint(
        selectedProfilePreset === null
          ? Object.keys(overrides).length > 0
            ? "Personal profile updated (runtime base + manual overrides)"
            : "Personal profile now matches live runtime settings"
          : Object.keys(overrides).length > 0
            ? `Personal profile updated (preset "${selectedProfilePreset}" + overrides)`
            : `Personal profile updated (preset "${selectedProfilePreset}")`
      );
    } catch (e) {
      setProfileError(e instanceof Error ? e.message : "Failed to update personal profile");
    }
  };

  const onDisableProfile = async () => {
    try {
      await updateMePreferences.mutateAsync({ preset: null, runbook_overrides: {} });
      setProfilePresetDraft(undefined);
      setProfileDraftOverrides({});
      setProfileError(null);
      setProfileHint("Personal profile disabled");
    } catch (e) {
      setProfileError(e instanceof Error ? e.message : "Failed to disable personal profile");
    }
  };

  return (
    <div className={layoutStyles.page}>
      <h1 className={layoutStyles.title}>Settings</h1>

      {error && (
        <div className={layoutStyles.errorBox} role="alert">
          Error: {error}
        </div>
      )}
      {localError && (
        <div className={layoutStyles.errorBox} role="alert">
          Error: {localError}
        </div>
      )}
      {mePreferencesError && (
        <div className={layoutStyles.errorBox} role="alert">
          Error: {mePreferencesError}
        </div>
      )}
      {profileError && (
        <div className={layoutStyles.errorBox} role="alert">
          Error: {profileError}
        </div>
      )}
      {loading && !data && <div role="status">Loading config...</div>}
      {mePreferencesLoading && !mePreferences && <div role="status">Loading personal profile...</div>}
      {hint && (
        <div className={layoutStyles.hint} role="status">
          {hint}
        </div>
      )}
      {profileHint && (
        <div className={layoutStyles.hint} role="status">
          {profileHint}
        </div>
      )}

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
          <h2 className={layoutStyles.sectionTitle}>My Deals Profile</h2>
          <p className={pageStyles.editorIntro}>
            These values personalize only your Deals feed. They do not change shared runtime
            settings or other users.
          </p>
          <div className={pageStyles.revertRow}>
            <span className={pageStyles.revertLabel}>
              Profile status: {profileStatusLabel}
            </span>
            <span className={pageStyles.revertLabel}>
              Base: {selectedProfilePreset ? `preset "${selectedProfilePreset}"` : "live runtime"}
            </span>
            {mePreferencesFetching && <span className={pageStyles.revertLabel}>Refreshing...</span>}
          </div>
          {profileInvalid && (
            <div className={layoutStyles.errorBox} role="alert">
              Stored personal profile is invalid. Disable profile to clear the stored record, then
              save a fresh profile.
            </div>
          )}

          {profileDraft && (
            <div className={pageStyles.editorCard}>
              {profileFieldGroups.map((group) => (
                <div key={`profile-${group.title}`} className={pageStyles.fieldGroup}>
                  <div className={pageStyles.groupLabel}>{group.title}</div>
                  <div className={pageStyles.grid}>
                    {group.fields.map((field) => {
                      const value = profileDraft[field];
                      const isBoolean = typeof value === "boolean";
                      const inputId = `${baseId}-profile-${field}`;
                      const labelText = FIELD_LABELS[field] ?? field;
                      const help = CONFIG_FIELD_HELP[field];
                      const labelBlock = (
                        <div className={pageStyles.label}>
                          <label htmlFor={inputId}>{labelText}</label>
                          {help && <HelpTooltip label={labelText} text={help} />}
                        </div>
                      );
                      return (
                        <div
                          key={`profile-${field}`}
                          className={isBoolean ? pageStyles.booleanField : pageStyles.field}
                        >
                          {isBoolean ? (
                            <>
                              <input
                                id={inputId}
                                type="checkbox"
                                checked={value as boolean}
                                onChange={(e) =>
                                  setProfileFieldOverride(field, e.target.checked)
                                }
                              />
                              {labelBlock}
                            </>
                          ) : (
                            <>
                              {labelBlock}
                              <input
                                id={inputId}
                                className={pageStyles.input}
                                type="number"
                                step="any"
                                value={value as string}
                                onChange={(e) => setProfileFieldOverride(field, e.target.value)}
                              />
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {profilePresetKeys.length > 0 && (
                <div className={pageStyles.revertRow}>
                  <span className={pageStyles.revertLabel}>Load from preset:</span>
                  {profilePresetKeys.map((key) => (
                    <button
                      key={`profile-preset-${key}`}
                      type="button"
                      className={pageStyles.buttonSecondary}
                      onClick={() => onLoadProfilePreset(key)}
                      disabled={profileSubmitting}
                    >
                      {key}
                    </button>
                  ))}
                  <button
                    type="button"
                    className={pageStyles.buttonSecondary}
                    onClick={onUseRuntimeBase}
                    disabled={profileSubmitting}
                  >
                    Use runtime defaults
                  </button>
                </div>
              )}

              <div className={pageStyles.actions}>
                <button
                  type="button"
                  className={pageStyles.buttonSecondary}
                  onClick={onResetProfileDraft}
                  disabled={profileSubmitting}
                >
                  Reset draft
                </button>
                <button
                  type="button"
                  className={pageStyles.buttonPrimary}
                  onClick={() => void onSaveProfile()}
                  disabled={profileSubmitting || !profileHasDraft}
                >
                  Save personal profile
                </button>
                <button
                  type="button"
                  className={pageStyles.buttonSecondary}
                  onClick={() => void onDisableProfile()}
                  disabled={profileSubmitting || (!profileActive && !profileInvalid)}
                >
                  Disable profile
                </button>
              </div>
            </div>
          )}

          <h2 className={layoutStyles.sectionTitle}>Live Configuration</h2>
          <ConfigAccordion config={data} />

          <h2 className={layoutStyles.sectionTitle}>Product Modes</h2>
          <p className={pageStyles.editorIntro}>
            A mode is your personal choice: it becomes the preset base of your Deals profile and
            clears your manual overrides. It does not change the shared runtime settings or other
            users.
          </p>
          {mePreferences ? (
            <ProductModes
              config={data}
              selectedPreset={mePreferences.selected_preset}
              hasOverrides={Object.keys(mePreferences.runbook_overrides).length > 0}
              onApplyPreset={(preset) => {
                setProfileError(null);
                setProfileHint(null);
                setApplyingPresetKey(preset.key);
                void (async () => {
                  try {
                    await updateMePreferences.mutateAsync({
                      preset: preset.key,
                      runbook_overrides: {},
                    });
                    setProfilePresetDraft(undefined);
                    setProfileDraftOverrides({});
                    setProfileHint(
                      `${modeForPreset(preset.key)?.label ?? preset.name} mode applied to your Deals profile (preset ${preset.key})`
                    );
                  } catch (e) {
                    setProfileError(e instanceof Error ? e.message : "Failed to apply mode");
                  } finally {
                    setApplyingPresetKey(null);
                  }
                })();
              }}
              applyingPresetKey={applyingPresetKey}
              disableAll={profileSubmitting}
            />
          ) : (
            <p className={pageStyles.editorIntro}>
              {mePreferencesLoading
                ? "Loading your personal profile before the modes can be applied..."
                : "Your personal profile could not be loaded, so no mode can be applied right now."}
            </p>
          )}

          <h2 className={layoutStyles.sectionTitle}>Custom Runbook Fields</h2>
          <p className={pageStyles.editorIntro}>
            These edits apply to every user. Edit values below, then preview the exact changes
            before saving. Uncheck "Persist" to apply changes for this session only, without
            writing to <code>.env</code>.
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
                      const inputId = `${baseId}-${field}`;
                      const labelText = FIELD_LABELS[field] ?? field;
                      const help = CONFIG_FIELD_HELP[field];
                      const labelBlock = (
                        <div className={pageStyles.label}>
                          <label htmlFor={inputId}>{labelText}</label>
                          {help && <HelpTooltip label={labelText} text={help} />}
                        </div>
                      );
                      return (
                        <div
                          key={field}
                          className={isBoolean ? pageStyles.booleanField : pageStyles.field}
                        >
                          {isBoolean ? (
                            <>
                              <input
                                id={inputId}
                                type="checkbox"
                                checked={value as boolean}
                                onChange={(e) => setFieldOverride(field, e.target.checked)}
                              />
                              {labelBlock}
                            </>
                          ) : (
                            <>
                              {labelBlock}
                              <input
                                id={inputId}
                                className={pageStyles.input}
                                type="number"
                                step="any"
                                value={value as string}
                                onChange={(e) => setFieldOverride(field, e.target.value)}
                              />
                            </>
                          )}
                        </div>
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
                  ref={previewButtonRef}
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
                  onCancel={closePreview}
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
