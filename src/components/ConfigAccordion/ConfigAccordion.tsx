import { useState } from "react";
import type { ConfigResponse } from "../../api/types";
import ConfigSection from "../ConfigSection/ConfigSection";
import ConfigRow from "../ConfigRow/ConfigRow";

interface ConfigAccordionProps {
  config: ConfigResponse;
}

const ConfigAccordion = ({ config }: ConfigAccordionProps) => {
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(["Screener Filters"]));

  const toggleSection = (name: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  return (
    <div>
      <ConfigSection
        title="Screener Filters"
        isOpen={openSections.has("Screener Filters")}
        onToggle={() => toggleSection("Screener Filters")}
      >
        <ConfigRow label="Min Score" value={config.min_score_bps} unit="bps" />
        <ConfigRow label="Min Volume 24h" value={config.min_volume_24h} prefix="$" />
        <ConfigRow label="Min Open Interest" value={config.min_open_interest} prefix="$" />
        <ConfigRow label="Min Persistence" value={config.min_persistence_hours} unit="h" />
      </ConfigSection>

      <ConfigSection
        title="Anti-Churn"
        isOpen={openSections.has("Anti-Churn")}
        onToggle={() => toggleSection("Anti-Churn")}
      >
        <ConfigRow label="Cooldown" value={config.anti_churn_cooldown_s} unit="s" />
        <ConfigRow label="Score Multiplier" value={config.anti_churn_score_multiplier} unit="×" />
      </ConfigSection>

      <ConfigSection
        title="Fees"
        isOpen={openSections.has("Fees")}
        onToggle={() => toggleSection("Fees")}
      >
        <ConfigRow label="Hyperliquid Fee (per side)" value={config.hl_fee_per_side} unit="%" />
        <ConfigRow label="Lighter Fee (per side)" value={config.lighter_fee_per_side} unit="%" />
      </ConfigSection>

      <ConfigSection
        title="Scoring Model"
        isOpen={openSections.has("Scoring Model")}
        onToggle={() => toggleSection("Scoring Model")}
      >
        <ConfigRow label="Expected Hold" value={config.expected_hold_hours} unit="h" />
        <ConfigRow label="Basis Weight" value={config.basis_weight} />
        <ConfigRow label="Basis Bonus Cap" value={config.basis_bonus_cap_bps} unit="bps" />
        <ConfigRow
          label="Basis Divergence Threshold"
          value={config.basis_divergence_threshold_bps}
          unit="bps"
        />
        <ConfigRow
          label="Max Basis Divergence"
          value={config.max_basis_divergence_hours}
          unit="h"
        />
        <ConfigRow
          label="Basis Expansion Penalty"
          value={config.basis_expansion_penalty_bps_per_hour}
          unit="bps/h"
        />
        <ConfigRow
          label="Hold Window Instability Scale"
          value={config.hold_window_instability_scale}
        />
        <ConfigRow label="Liquidity Weight" value={config.liquidity_weight} />
        <ConfigRow label="Timing Penalty" value={config.timing_penalty_bps_per_hour} unit="bps/h" />
        <ConfigRow
          label="Max Funding Timing Asymmetry"
          value={config.max_funding_timing_asymmetry_hours}
          unit="h"
        />
        <ConfigRow label="Max Basis" value={config.max_basis_bps} unit="bps" />
        <ConfigRow
          label="Max Basis Trend"
          value={config.max_basis_trend_bps_per_tick}
          unit="bps/tick"
        />
        <ConfigRow label="Max Funding Diff APR" value={config.max_reasonable_apr} unit="%" />
        <ConfigRow label="Max Entry ADL Level" value={config.max_entry_adl_level} unit="/5" />
        <ConfigRow label="Require Isolated Margin" value={config.require_isolated_margin} />
        <ConfigRow label="Allow Unknown Margin Mode" value={config.allow_unknown_margin_mode} />
      </ConfigSection>

      <ConfigSection
        title="Runtime"
        isOpen={openSections.has("Runtime")}
        onToggle={() => toggleSection("Runtime")}
      >
        <ConfigRow label="Default Order Size" value={config.default_order_size_usd} prefix="$" />
        <ConfigRow label="Require Real Depth" value={config.require_real_depth} />
        <ConfigRow label="Real-Depth Proxy Floor Ratio" value={config.real_depth_proxy_floor_ratio} />
        <ConfigRow label="Loop Interval" value={config.loop_interval_s} unit="s" />
        <ConfigRow label="Stale Data Threshold" value={config.stale_data_s} unit="s" />
      </ConfigSection>

      <ConfigSection
        title="Execution Safety Contract"
        isOpen={openSections.has("Execution Safety Contract")}
        onToggle={() => toggleSection("Execution Safety Contract")}
      >
        <ConfigRow label="Execution Enabled" value={config.exec_enabled} />
        <ConfigRow label="Dry Run" value={config.exec_dry_run} />
        <ConfigRow
          label="Stop on Consecutive Rollbacks"
          value={config.exec_stop_on_consecutive_rollbacks}
        />
        <ConfigRow
          label="Stop on API Errors (per window)"
          value={config.exec_stop_on_api_errors_per_window}
        />
        <ConfigRow label="API Error Window" value={config.exec_api_error_window_s} unit="s" />
        <ConfigRow
          label="Stop on Median Slippage"
          value={config.exec_stop_on_median_slippage_bps}
          unit="bps"
        />
        <ConfigRow label="Slippage Sample Size" value={config.exec_slippage_sample_size} />
        <ConfigRow label="Stop on Stale Data" value={config.exec_stop_on_stale_data_s} unit="s" />
        <ConfigRow label="Margin Alert" value={config.exec_margin_alert_pct} unit="%" />
        <ConfigRow label="Margin Force Close" value={config.exec_margin_force_close_pct} unit="%" />
        <ConfigRow label="ADL Warn Quantile" value={config.exec_adl_warn_quantile} />
        <ConfigRow label="ADL Critical Quantile" value={config.exec_adl_critical_quantile} />
        <ConfigRow label="Recovery Cooldown" value={config.exec_recovery_cooldown_s} unit="s" />
        <ConfigRow
          label="Recovery Requires Manual Ack"
          value={config.exec_recovery_require_manual_ack}
        />
      </ConfigSection>
    </div>
  );
};

export default ConfigAccordion;
