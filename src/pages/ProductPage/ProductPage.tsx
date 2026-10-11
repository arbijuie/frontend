import pageStyles from "../../styles/Page.module.scss";
import styles from "./ProductPage.module.scss";
import PageHeader from "../../components/PageHeader/PageHeader";
import ModeCard from "../../components/ModeCard/ModeCard";
import ModeCompatibilityTable from "../../components/ModeCompatibilityTable/ModeCompatibilityTable";
import { usePageTitle } from "../../hooks/usePageTitle";
import { PRODUCT_MODES } from "../../lib/productModes";

const HIGHLIGHTS = [
  {
    title: "Screens funding across venues",
    text: "Perpetual funding rates from Hyperliquid, Lighter, Aster, Binance, Bybit, dYdX and Extended, refreshed continuously.",
  },
  {
    title: "Ranks routes after costs",
    text: "Each route is long on one venue and short on another. Fees, slippage, basis and funding timing come off the edge before a route is ranked.",
  },
  {
    title: "Explains every decision",
    text: "Routes are READY, WATCHING or BLOCKED, always with the reasons, so you can see why a signal is or is not actionable.",
  },
];

/** Public product overview (issue #303): what the screener does and the product modes. */
const ProductPage = () => {
  usePageTitle("Product");

  return (
    <div className={pageStyles.page}>
      <PageHeader
        title="Product"
        subtitle="A funding-rate arbitrage screener for perpetual futures."
      />

      <ul className={styles.highlights}>
        {HIGHLIGHTS.map(({ title, text }) => (
          <li key={title} className={styles.highlight}>
            <h2 className={styles.highlightTitle}>{title}</h2>
            <p>{text}</p>
          </li>
        ))}
      </ul>

      <h2 className={pageStyles.sectionTitle}>Product modes</h2>
      <p className={styles.lead}>
        A mode sets how strict the screener is. Stricter modes show fewer, steadier signals; looser
        modes show more signals sooner, with more noise. Operators switch modes on the Config page,
        and each mode applies one runtime preset.
      </p>
      <div className={styles.modes}>
        {PRODUCT_MODES.map((mode) => (
          <ModeCard key={mode.key} mode={mode} />
        ))}
      </div>

      <h2 className={pageStyles.sectionTitle}>Mode to preset mapping</h2>
      <ModeCompatibilityTable />
    </div>
  );
};

export default ProductPage;
