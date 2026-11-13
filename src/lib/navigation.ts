import {
  Activity,
  BookOpen,
  Briefcase,
  Bot,
  FlaskConical,
  LineChart,
  MoreHorizontal,
  Play,
  Settings,
  ShieldCheck,
  Wrench,
  type LucideIcon,
  Rocket,
  BarChart3,
} from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Extra path prefixes that keep this item highlighted (pages reached from it). */
  matchPrefixes?: readonly string[];
}

/**
 * MVP bottom menu: Deals | Health | Settings | More.
 * Auto/Positions stay reachable under More → Experts while execution is latched off.
 */
export const NAV_ITEMS: readonly NavItem[] = [
  { to: "/", label: "Deals", icon: LineChart },
  { to: "/status", label: "Health", icon: Activity },
  { to: "/config", label: "Settings", icon: Settings },
  { to: "/more", label: "More", icon: MoreHorizontal, matchPrefixes: ["/learn", "/welcome"] },
];

export interface MoreSection {
  title: string;
  items: readonly { to: string; label: string; description: string; icon: LucideIcon }[];
}

/** Every page lives under the operator layout, so the bottom menu is on every screen. */
export const MORE_SECTIONS: readonly MoreSection[] = [
  {
    title: "Learn",
    items: [
      {
        to: "/welcome",
        label: "Getting started",
        description: "Four short screens: how deals work and how to read them.",
        icon: Rocket,
      },
      {
        to: "/learn/how-it-works",
        label: "How it works",
        description: "How the app finds deals.",
        icon: BookOpen,
      },
      {
        to: "/learn/about",
        label: "About the app",
        description: "What the app can and cannot do.",
        icon: BookOpen,
      },
      {
        to: "/learn/statistics",
        label: "Results so far",
        description: "How many deals the app finds and how good they are.",
        icon: BarChart3,
      },
      {
        to: "/learn/onboarding",
        label: "Onboarding",
        description: "Check that this device reaches the app and the exchanges.",
        icon: ShieldCheck,
      },
    ],
  },
  {
    title: "For experts",
    items: [
      {
        to: "/automation",
        label: "Auto",
        description: "Automatic entries when trading is armed.",
        icon: Bot,
      },
      {
        to: "/positions",
        label: "My open deals",
        description: "Positions you hold now.",
        icon: Briefcase,
      },
      {
        to: "/backtest",
        label: "Backtest",
        description: "Test a strategy on past data.",
        icon: FlaskConical,
      },
      {
        to: "/execution/preflight",
        label: "Pre-trade check",
        description: "Check a trade before it runs.",
        icon: Play,
      },
      {
        to: "/operations",
        label: "System logs",
        description: "Runtime operations and recovery.",
        icon: Wrench,
      },
    ],
  },
];

/** Operator garage / Mini App home (Deals). */
export const OPERATOR_HOME_PATH = "/";

export const APP_NAME = "Arbijuie";

export function formatPageTitle(section: string): string {
  return `${section} · ${APP_NAME}`;
}
