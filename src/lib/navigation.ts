import { Activity, FlaskConical, LineChart, Play, Settings, type LucideIcon } from "lucide-react";

export interface NavItem {
  /** Route path. Must be unique and start with "/". */
  to: string;
  /** Short label shown in the bottom navigation. */
  label: string;
  icon: LucideIcon;
}

/**
 * Single source of truth for primary navigation.
 *
 * Order reflects operator workflow priority: find opportunities, check runtime status,
 * tune config, validate via backtest, then execute.
 */
export const NAV_ITEMS: readonly NavItem[] = [
  { to: "/", label: "Opportunities", icon: LineChart },
  { to: "/status", label: "Status", icon: Activity },
  { to: "/config", label: "Config", icon: Settings },
  { to: "/backtest", label: "Backtest", icon: FlaskConical },
  { to: "/execution", label: "Execution", icon: Play },
];

export const APP_NAME = "Arbijuie";

export function formatPageTitle(section: string): string {
  return `${section} · ${APP_NAME}`;
}
