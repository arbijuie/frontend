import type { ConfigResponse } from "../../api/types";
import { buildPresets, findMatchingPreset, type Preset } from "../../lib/presets";
import { PRODUCT_MODES, describePresetThresholds } from "../../lib/productModes";
import ModeCard from "../ModeCard/ModeCard";
import ModeCompatibilityTable from "../ModeCompatibilityTable/ModeCompatibilityTable";
import styles from "./ProductModes.module.scss";

interface ProductModesProps {
  config: ConfigResponse;
  onApplyPreset: (preset: Preset) => void;
  applyingPresetKey: string | null;
  disableAll: boolean;
}

/**
 * Product modes over the runtime runbook presets (issue #303). Thresholds come from the live
 * `runbook_presets` payload; applying a mode sends its unchanged preset key.
 */
const ProductModes = ({
  config,
  onApplyPreset,
  applyingPresetKey,
  disableAll,
}: ProductModesProps) => {
  const presets = buildPresets(config);
  const matched = findMatchingPreset(config, presets);
  const presetByKey = new Map(presets.map((preset) => [preset.key, preset]));
  const modes = PRODUCT_MODES.flatMap((mode) => {
    const preset = presetByKey.get(mode.preset);
    return preset ? [{ mode, preset }] : [];
  });

  return (
    <div>
      {!matched && (
        <p className={styles.note}>
          Current config doesn't exactly match any mode — running a custom configuration.
        </p>
      )}
      <div className={styles.grid}>
        {modes.map(({ mode, preset }) => (
          <ModeCard
            key={mode.key}
            mode={mode}
            thresholds={describePresetThresholds(preset.values)}
            action={{
              isActive: matched?.key === preset.key,
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
