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
    description: "An overview of the product will appear here.",
  },
  {
    to: "/how-it-works",
    label: "How it works",
    description: "An explanation of how the screener works will appear here.",
  },
  {
    to: "/statistics",
    label: "Statistics",
    description: "Public statistics will appear here.",
  },
  {
    to: "/onboarding",
    label: "Onboarding",
    description: "A guided first-time setup will appear here.",
  },
];

export const APP_NAME = "Arbijuie";

export function formatPageTitle(section: string): string {
  return `${section} · ${APP_NAME}`;
}
