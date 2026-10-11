import {
  Activity,
  Bot,
  FlaskConical,
  LineChart,
  Play,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

export interface PublicNavItem {
  to: string;
  label: string;
  description: string;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { to: "/", label: "Opportunities", icon: LineChart },
  { to: "/status", label: "Status", icon: Activity },
  { to: "/config", label: "Config", icon: Settings },
  { to: "/backtest", label: "Backtest", icon: FlaskConical },
  { to: "/execution/preflight", label: "Preflight", icon: Play },
  { to: "/automation", label: "Automation", icon: Bot },
];

export const PUBLIC_NAV_ITEMS: readonly PublicNavItem[] = [
  {
    to: "/product",
    label: "Product",
    description: "What the screener does and the product modes.",
  },
  {
    to: "/how-it-works",
    label: "How it works",
    description: "An explanation of how the screener works will appear here.",
  },
  {
    to: "/statistics",
    label: "Statistics",
    description: "Coverage, data sources and signal quality of the screener.",
  },
  {
    to: "/journal",
    label: "Journal",
    description: "Daily history of what the screener observed.",
  },
  {
    to: "/onboarding",
    label: "Onboarding",
    description: "Guided checks from prerequisites to the first runtime signal.",
  },
];

export const APP_NAME = "Arbijuie";

export function formatPageTitle(section: string): string {
  return `${section} · ${APP_NAME}`;
}
