import { useId } from "react";
import { useSearchParams } from "react-router-dom";
import pageStyles from "../../styles/Page.module.scss";
import PageHeader from "../../components/PageHeader/PageHeader";
import Tabs from "../../components/Tabs/Tabs";
import { usePageTitle } from "../../hooks/usePageTitle";
import { tabId, tabPanelId } from "../../lib/tabIds";
import {
  DEFAULT_OPERATIONS_TAB,
  OPERATIONS_TABS,
  isOperationsTab,
  type OperationsTab,
} from "../../lib/operations";
import ExecutionActionsPanel from "./panels/ExecutionActionsPanel";
import PositionsPanel from "./panels/PositionsPanel";
import GuardrailsPanel from "./panels/GuardrailsPanel";
import ParityPanel from "./panels/ParityPanel";
import ContinuityPanel from "./panels/ContinuityPanel";

const SUBTITLE: Record<OperationsTab, string> = {
  actions: "Open and close two-leg pairs with explicit confirmation, and read the attempt history",
  positions: "Open pairs, venue accounts, and the daily PnL ledger",
  guardrails: "Risk guardrail decisions, entry blocks, closes, and capital limits",
  parity: "Legacy versus shadow execution parity report and artifacts",
  continuity: "Durable snapshot capture health and gap windows",
};

/**
 * Operator surfaces for API capabilities that had no UI (issues #507 to #513). One nav entry,
 * one tab per surface; the active tab lives in the URL (`?tab=`) so deep links and reloads keep
 * their place.
 */
const OperationsPage = () => {
  usePageTitle("Operations");
  const tabsId = useId();
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get("tab");
  const activeTab: OperationsTab = isOperationsTab(requested) ? requested : DEFAULT_OPERATIONS_TAB;

  const selectTab = (key: string) => {
    const next = new URLSearchParams(searchParams);
    if (key === DEFAULT_OPERATIONS_TAB) {
      next.delete("tab");
    } else {
      next.set("tab", key);
    }
    setSearchParams(next, { replace: true });
  };

  return (
    <div className={pageStyles.page}>
      <PageHeader title="Operations" subtitle={SUBTITLE[activeTab]} />
      <Tabs
        tabs={[...OPERATIONS_TABS]}
        activeKey={activeTab}
        onChange={selectTab}
        label="Operations sections"
        idPrefix={tabsId}
      />
      <div
        role="tabpanel"
        id={tabPanelId(tabsId, activeTab)}
        aria-labelledby={tabId(tabsId, activeTab)}
      >
        {activeTab === "actions" && <ExecutionActionsPanel />}
        {activeTab === "positions" && <PositionsPanel />}
        {activeTab === "guardrails" && <GuardrailsPanel />}
        {activeTab === "parity" && <ParityPanel />}
        {activeTab === "continuity" && <ContinuityPanel />}
      </div>
    </div>
  );
};

export default OperationsPage;
