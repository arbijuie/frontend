import type { ConfigResponse } from "../../api/types";
import { PRESETS, findMatchingPreset } from "../../lib/presets";
import PresetCard from "../PresetCard/PresetCard";
import styles from "./PresetComparison.module.scss";
import type { Preset } from "../../lib/presets";

interface PresetComparisonProps {
  config: ConfigResponse;
  onApplyPreset: (preset: Preset) => void;
  applyingPresetKey: string | null;
}

const PresetComparison = ({
  config,
  onApplyPreset,
  applyingPresetKey,
}: PresetComparisonProps) => {
  const matched = findMatchingPreset(config);

  return (
    <div>
      {!matched && (
        <div className={styles.note}>
          Current config doesn't exactly match any preset — running a custom configuration.
        </div>
      )}
      {PRESETS.map((preset) => (
        <PresetCard
          key={preset.name}
          preset={preset}
          isActive={matched?.name === preset.name}
          isApplying={applyingPresetKey === preset.key}
          onApply={onApplyPreset}
        />
      ))}
    </div>
  );
};

export default PresetComparison;
