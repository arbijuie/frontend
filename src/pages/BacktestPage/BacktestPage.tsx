import pageStyles from "../../styles/Page.module.scss";
import { useState } from "react";
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
import FloatingRefreshButton from "../../components/FloatingRefreshButton/FloatingRefreshButton";
import { ApiValidationError } from "../../lib/api-errors";
import type { BacktestReplayRequest, BacktestMetrics } from "../../api/types";
import { usePageTitle } from "../../hooks/usePageTitle";

const TABS = [
  { key: "summary", label: "Summary" },
  { key: "replay", label: "Replay" },
  { key: "gate", label: "Gate" },
  { key: "locks", label: "Locks" },
  { key: "lock-detail", label: "Detail" },
];

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
  const runReplay = useRunBacktestReplay();
  const createLock = useCreateBacktestLock();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("summary");
  const [selectedLockId, setSelectedLockId] = useState<string | null>(null);
  const [lastRequest, setLastRequest] = useState<BacktestReplayRequest | null>(null);
  const [lastResult, setLastResult] = useState<BacktestMetrics | null>(null);
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
      setLastResult(result.metrics);
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
    setSelectedLockId(lockId);
    setActiveTab("lock-detail");
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
      {lastRefreshedAt && (
        <div className={pageStyles.hint}>Last refreshed {lastRefreshedAt.toLocaleTimeString()}</div>
      )}
      <Tabs tabs={TABS} activeKey={activeTab} onChange={setActiveTab} />

      {activeTab === "summary" && (
        <>
          {summaryError && <div className={pageStyles.errorBox}>Error: {summaryError}</div>}
          {summaryLoading && !summary && <div>Loading summary...</div>}
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
          {replayError && <div className={pageStyles.errorBox}>Error: {replayError}</div>}
          {lockHint && <div className={pageStyles.hint}>{lockHint}</div>}
          {lastResult && (
            <ReplayResultPanel
              metrics={lastResult}
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
          {gateError && <div className={pageStyles.errorBox}>Error: {gateError}</div>}
          {gateLoading && !gate && <div>Loading gate status...</div>}
          {gate && <GateStatusBanner gate={gate} />}
        </>
      )}

      {activeTab === "locks" && <BacktestLockList onSelectLock={handleSelectLock} />}

      {activeTab === "lock-detail" && <BacktestLockDetail lockId={selectedLockId} />}

      <FloatingRefreshButton fetching={summaryFetching} onClick={handleRefreshAll} />
    </div>
  );
};

export default BacktestPage;
