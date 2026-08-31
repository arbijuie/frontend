import type { ConfigResponse } from "../../api/types";
import { PRESETS, findMatchingPreset } from "../../lib/presets";
import PresetCard from "../PresetCard/PresetCard";
import styles from "./PresetComparison.module.scss";

interface PresetComparisonProps {
  config: ConfigResponse;
}

const PresetComparison = ({ config }: PresetComparisonProps) => {
  const matched = findMatchingPreset(config);

  return (
    <div>
      {!matched && (
        <div className={styles.note}>
          Current config doesn't exactly match any preset — running a custom configuration.
        </div>
      )}
      {PRESETS.map((preset) => (
        <PresetCard key={preset.name} preset={preset} isActive={matched?.name === preset.name} />
      ))}
    </div>
  );
};

export default PresetComparison;
