export interface WelcomeStep {
  eyebrow: string;
  title: string;
  intro: string;
  points: readonly { term: string; text: string; tone?: "income" | "warning" | "danger" }[];
}

/** Plain-English guide for a first-time trader. Thresholds mirror lib/priceCheck. */
export const WELCOME_STEPS: readonly WelcomeStep[] = [
  {
    eyebrow: "What the app does",
    title: "Earn from the difference between exchanges",
    intro:
      "Futures exchanges pay or charge a small fee every few hours, called the payout rate. Different exchanges pay different rates for the same coin.",
    points: [
      {
        term: "Two opposite positions",
        text: "The app buys a coin on one exchange and sells the same coin on another. If the price moves, one side gains what the other loses.",
      },
      {
        term: "You keep the difference",
        text: "Example: exchange A pays you 0.03% every 8 hours and exchange B charges you 0.01%. You collect about 0.02% every 8 hours.",
        tone: "income",
      },
      {
        term: "The app does the searching",
        text: "It checks hundreds of coin pairs all the time and only lets you open the ones that pass every check.",
      },
    ],
  },
  {
    eyebrow: "Reading a deal",
    title: "Three numbers tell you if a deal is worth it",
    intro: "Every deal card starts with the same three lines.",
    points: [
      {
        term: "Expected income, % per year",
        text: "What you would earn if the payout rates stay the same. Green means income. Grey or minus means it does not pay.",
        tone: "income",
      },
      {
        term: "Costs to enter and exit",
        text: "Exchange fees and price slippage for opening and closing both sides, as a share of your deal size.",
      },
      {
        term: "Pays off in",
        text: "How long the deal must stay open before income covers the costs. Shorter is better.",
      },
    ],
  },
  {
    eyebrow: "Deal status",
    title: "Only Ready deals can be opened",
    intro: "Deals are grouped so the good ones come first.",
    points: [
      { term: "Ready", text: "Passed every check. You can open it now.", tone: "income" },
      {
        term: "On watch",
        text: "Almost good. The app keeps checking and moves it to Ready when it qualifies.",
      },
      {
        term: "Blocked",
        text: "Something is wrong. Open the card to see the reasons in plain words under Why it is blocked.",
        tone: "warning",
      },
      {
        term: "Probably not the same coin",
        text: "Prices on the two exchanges differ by more than 20%. Usually two different tokens share one name. Never open these.",
        tone: "danger",
      },
    ],
  },
  {
    eyebrow: "Before you start",
    title: "Start in practice mode",
    intro:
      "Practice mode simulates trades without real money. Use it until the numbers make sense to you.",
    points: [
      {
        term: "You can lose money",
        text: "Payout rates can flip, prices can jump before both sides are filled, and exchanges can fail.",
        tone: "danger",
      },
      {
        term: "Check Health first",
        text: "Green means prices are fresh. Yellow or red means do not trust the numbers right now.",
      },
      {
        term: "Real money always asks first",
        text: "With real money on, every new deal and every bot restart asks you to confirm the risks.",
        tone: "warning",
      },
    ],
  },
];
