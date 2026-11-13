import pageStyles from "../../styles/Page.module.scss";
import { useId, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  useBacktestSummary,
  useBacktestGate,
  useRunBacktestReplay,
  useCreateBacktestLock,
} from "../../hooks/useBacktest";
import Tabs from "../../components/Tabs/Tabs";
import BacktestSummaryCards from "../../components/BacktestSummaryCards/BacktestSummaryCards";
import GateStatusBanner from "../../components/GateStatusBanner/GateStatusBanner";
import ReplayForm from "../../components/ReplayForm/ReplayForm";
import ReplayResultPanel from "../../components/ReplayResultPanel/ReplayResultPanel";
import BacktestLockList from "../../components/BacktestLockList/BacktestLockList";
import BacktestLockDetail from "../../components/BacktestLockDetail/BacktestLockDetail";
import BacktestHistoryPanel from "../../components/BacktestHistoryPanel/BacktestHistoryPanel";
import BacktestSurvivalPanel from "../../components/BacktestSurvivalPanel/BacktestSurvivalPanel";
import FloatingRefreshButton from "../../components/FloatingRefreshButton/FloatingRefreshButton";
import { ApiValidationError } from "../../lib/api-errors";
import {
  BACKTEST_TABS,
  DEFAULT_BACKTEST_TAB,
  isBacktestTab,
  type BacktestTab,
} from "../../lib/backtestTabs";
import { tabId, tabPanelId } from "../../lib/tabIds";
import type { BacktestReplayRequest, BacktestReplayResponse } from "../../api/types";
import { usePageTitle } from "../../hooks/usePageTitle";

const BacktestPage = () => {
  usePageTitle("Backtest");
  const {
    data: summary,
    error: summaryError,
    loading: summaryLoading,
    fetching: summaryFetching,
    refetch: refetchSummary,
  } = useBacktestSummary();
  const {
    data: gate,
    error: gateError,
    loading: gateLoading,
    refetch: refetchGate,
  } = useBacktestGate();
  const tabsId = useId();
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get("tab");
  const activeTab: BacktestTab = isBacktestTab(requested) ? requested : DEFAULT_BACKTEST_TAB;
  const selectedLockId = searchParams.get("lock");
  const runReplay = useRunBacktestReplay();
  const createLock = useCreateBacktestLock();
  const queryClient = useQueryClient();

  const selectTab = (key: string) => {
    const next = new URLSearchParams(searchParams);
    if (key === DEFAULT_BACKTEST_TAB) {
      next.delete("tab");
    } else {
      next.set("tab", key);
    }
    if (key !== "lock-detail") {
      next.delete("lock");
    }
    setSearchParams(next, { replace: true });
  };
  const [lastRequest, setLastRequest] = useState<BacktestReplayRequest | null>(null);
  const [lastResult, setLastResult] = useState<BacktestReplayResponse | null>(null);
  const [replayError, setReplayError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string> | undefined>(undefined);
  const [lockHint, setLockHint] = useState<string | null>(null);
  const [lockCreatedForResult, setLockCreatedForResult] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);

  const handleRunReplay = async (request: BacktestReplayRequest) => {
    setReplayError(null);
    setFieldErrors(undefined);
    setLockHint(null);
    setLockCreatedForResult(false);
    setLastRequest(request);
    try {
      const result = await runReplay.mutateAsync(request);
      setLastResult(result);
    } catch (e) {
      if (e instanceof ApiValidationError) {
        setFieldErrors(e.fieldErrors);
        setReplayError("Please fix the highlighted fields.");
      } else {
        setReplayError(e instanceof Error ? e.message : "Replay failed");
      }
      setLastResult(null);
    }
  };

  const handleCreateLock = async () => {
    if (!lastRequest) return;
    setLockHint(null);
    try {
      const lock = await createLock.mutateAsync(lastRequest);
      setLockHint(`Lock ${lock.lock_id} created`);
      setLockCreatedForResult(true);
    } catch (e) {
      setReplayError(e instanceof Error ? e.message : "Failed to create lock");
    }
  };

  const handleSelectLock = (lockId: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("tab", "lock-detail");
    next.set("lock", lockId);
    setSearchParams(next, { replace: true });
  };

  const handleRefreshAll = async () => {
    await Promise.all([
      refetchSummary(),
      refetchGate(),
      queryClient.invalidateQueries({ queryKey: ["backtest-locks"] }),
    ]);
    setLastRefreshedAt(new Date());
  };

  return (
    <div className={pageStyles.page}>
      <h1 className={pageStyles.title}>Backtest</h1>
      <div className={pageStyles.hint} role="status">
        {lastRefreshedAt ? `Last refreshed ${lastRefreshedAt.toLocaleTimeString()}` : ""}
      </div>
      <Tabs
        tabs={[...BACKTEST_TABS]}
        activeKey={activeTab}
        onChange={selectTab}
        label="Backtest sections"
        idPrefix={tabsId}
      />

      <div
        role="tabpanel"
        id={tabPanelId(tabsId, activeTab)}
        aria-labelledby={tabId(tabsId, activeTab)}
      >
        {activeTab === "summary" && (
          <>
            {summaryError && (
              <div className={pageStyles.errorBox} role="alert">
                Error: {summaryError}
              </div>
            )}
            {summaryLoading && !summary && <div role="status">Loading summary...</div>}
            {summary && (
              <>
                <BacktestSummaryCards summary={summary} />
                {summary.total_snapshots === 0 && (
                  <div className={pageStyles.hint}>
                    No snapshot data captured yet — results will appear once the backend accumulates
                    enough runtime history.
                  </div>
                )}
              </>
            )}
          </>
        )}

        {activeTab === "replay" && (
          <>
            <ReplayForm
              onSubmit={handleRunReplay}
              submitting={runReplay.isPending}
              fieldErrors={fieldErrors}
            />
            {replayError && (
              <div className={pageStyles.errorBox} role="alert">
                Error: {replayError}
              </div>
            )}
            {lockHint && (
              <div className={pageStyles.hint} role="status">
                {lockHint}
              </div>
            )}
            {lastResult && (
              <ReplayResultPanel
                metrics={lastResult.metrics}
                replaySource={lastResult.replay_source}
                replayDiagnostics={lastResult.replay_source_diagnostics}
                usedRequest={lastRequest}
                onCreateLock={handleCreateLock}
                creatingLock={createLock.isPending}
                lockCreated={lockCreatedForResult}
              />
            )}
          </>
        )}

        {activeTab === "gate" && (
          <>
            {gateError && (
              <div className={pageStyles.errorBox} role="alert">
                Error: {gateError}
              </div>
            )}
            {gateLoading && !gate && <div role="status">Loading gate status...</div>}
            {gate && <GateStatusBanner gate={gate} />}
          </>
        )}

        {activeTab === "locks" && <BacktestLockList onSelectLock={handleSelectLock} />}

        {activeTab === "lock-detail" && <BacktestLockDetail lockId={selectedLockId} />}

        {activeTab === "history" && <BacktestHistoryPanel />}

        {activeTab === "survival" && <BacktestSurvivalPanel />}
      </div>

      <FloatingRefreshButton
        fetching={summaryFetching}
        onClick={handleRefreshAll}
        label="Refresh backtest data"
      />
    </div>
  );
};

export default BacktestPage;
