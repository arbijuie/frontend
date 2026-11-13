import type { ConfigPresetName, ConfigResponse } from "../../api/types";
import { buildPresets, findMatchingPreset, type Preset } from "../../lib/presets";
import { PRODUCT_MODES, describePresetThresholds, modeForPreset } from "../../lib/productModes";
import ModeCard from "../ModeCard/ModeCard";
import ModeCompatibilityTable from "../ModeCompatibilityTable/ModeCompatibilityTable";
import styles from "./ProductModes.module.scss";

interface ProductModesProps {
  /** Live runtime config; the cards read their thresholds from its `runbook_presets`. */
  config: ConfigResponse;
  /** The user's saved preset base (`selected_preset` of `/me/preferences`), null = none. */
  selectedPreset: ConfigPresetName | null;
  /** Whether the user's profile carries manual overrides on top of the preset base. */
  hasOverrides: boolean;
  onApplyPreset: (preset: Preset) => void;
  applyingPresetKey: string | null;
  disableAll: boolean;
}

/**
 * Product modes over the runtime runbook presets (issues #303 and #714). Thresholds come from
 * the live `runbook_presets` payload; the active mode is the user's own preset base, and
 * applying a mode sends its unchanged preset key to the user's profile, never to `/config`.
 */
const ProductModes = ({
  config,
  selectedPreset,
  hasOverrides,
  onApplyPreset,
  applyingPresetKey,
  disableAll,
}: ProductModesProps) => {
  const presets = buildPresets(config);
  const presetByKey = new Map(presets.map((preset) => [preset.key, preset]));
  const modes = PRODUCT_MODES.flatMap((mode) => {
    const preset = presetByKey.get(mode.preset);
    return preset ? [{ mode, preset }] : [];
  });
  const runtimeMode = (() => {
    const matched = findMatchingPreset(config, presets);
    return matched ? modeForPreset(matched.key) : null;
  })();

  return (
    <div>
      {selectedPreset === null ? (
        <p className={styles.note}>
          No mode selected: your Deals feed follows the live runtime settings, which currently{" "}
          {runtimeMode ? `match the ${runtimeMode.label} mode` : "match no mode (custom values)"}.
          Pick a mode to make the choice yours.
        </p>
      ) : (
        hasOverrides && (
          <p className={styles.note}>
            Your profile adds manual overrides on top of this mode. Applying a mode clears them.
          </p>
        )
      )}
      <div className={styles.grid}>
        {modes.map(({ mode, preset }) => (
          <ModeCard
            key={mode.key}
            mode={mode}
            thresholds={describePresetThresholds(preset.values)}
            action={{
              isActive: selectedPreset === preset.key,
              isApplying: applyingPresetKey === preset.key,
              isDisabled: disableAll,
              onApply: () => onApplyPreset(preset),
            }}
          />
        ))}
      </div>
      <ModeCompatibilityTable />
    </div>
  );
};

export default ProductModes;
