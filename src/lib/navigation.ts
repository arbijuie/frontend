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
  Wrench,
  type LucideIcon,
  Rocket,
  ShieldCheck,
  BarChart3,
  CalendarDays,
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

/** Bottom menu: always four items so it fits on a phone. */
export const NAV_ITEMS: readonly NavItem[] = [
  { to: "/", label: "Deals", icon: LineChart },
  { to: "/automation", label: "Auto", icon: Bot },
  { to: "/status", label: "Health", icon: Activity },
  { to: "/more", label: "More", icon: MoreHorizontal },
];

export interface MoreSection {
  title: string;
  items: readonly { to: string; label: string; description: string; icon: LucideIcon }[];
}

/** Everything that is not on the bottom menu lives under More. */
export const MORE_SECTIONS: readonly MoreSection[] = [
  {
    title: "My trading",
    items: [
      {
        to: "/positions",
        label: "My open deals",
        description: "Positions you hold now.",
        icon: Briefcase,
      },
      {
        to: "/config",
        label: "Settings",
        description: "Limits, exchanges and trading style.",
        icon: Settings,
      },
    ],
  },
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
        to: "/statistics",
        label: "Results so far",
        description: "How many deals the app finds and how good they are.",
        icon: BarChart3,
      },
      {
        to: "/journal",
        label: "Daily history",
        description: "What the app saw each day.",
        icon: CalendarDays,
      },
      {
        to: "/how-it-works",
        label: "How it works",
        description: "How the app finds deals.",
        icon: BookOpen,
      },
      {
        to: "/product",
        label: "About the app",
        description: "What the app can and cannot do.",
        icon: BookOpen,
      },
    ],
  },
  {
    title: "For experts",
    items: [
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
        to: "/onboarding",
        label: "System check",
        description: "Check that this device reaches the app and the exchanges.",
        icon: ShieldCheck,
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

export const PUBLIC_NAV_ITEMS: readonly PublicNavItem[] = [
  {
    to: "/product",
    label: "Product",
    description: "What the screener does and the product modes.",
  },
  {
    to: "/how-it-works",
    label: "How it works",
    description: "From venue feeds to a ranked, explained list of funding-rate routes.",
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
