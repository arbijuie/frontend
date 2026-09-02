import type { ConfigResponse } from "../../api/types";
import { buildPresets, findMatchingPreset } from "../../lib/presets";
import PresetCard from "../PresetCard/PresetCard";
import styles from "./PresetComparison.module.scss";
import type { Preset } from "../../lib/presets";

interface PresetComparisonProps {
  config: ConfigResponse;
  onApplyPreset: (preset: Preset) => void;
  applyingPresetKey: string | null;
  disableAll: boolean;
}

const PresetComparison = ({
  config,
  onApplyPreset,
  applyingPresetKey,
  disableAll,
}: PresetComparisonProps) => {
  const presets = buildPresets(config);
  const matched = findMatchingPreset(config, presets);

  return (
    <div>
      {!matched && (
        <div className={styles.note}>
          Current config doesn't exactly match any preset — running a custom configuration.
        </div>
      )}
      {presets.map((preset) => (
        <PresetCard
          key={preset.name}
          preset={preset}
          isActive={matched?.name === preset.name}
          isApplying={applyingPresetKey === preset.key}
          isDisabled={disableAll}
          onApply={onApplyPreset}
        />
      ))}
    </div>
  );
};

export default PresetComparison;
