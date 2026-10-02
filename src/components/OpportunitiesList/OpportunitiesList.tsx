import styles from "./OpportunitiesList.module.scss";
import { useMemo, useState } from "react";
import type { OpportunityItem } from "../../api/types";
import OpportunityCard from "../OpportunityCard/OpportunityCard";
import StatusFilterTabs, { type StatusFilter } from "../StatusFilterTabs/StatusFilterTabs";
import SymbolSearch from "../SymbolSearch/SymbolSearch";
import EmptyState from "../EmptyState/EmptyState";

type SortKey = "priority" | "combined_score" | "funding_diff_apr" | "hours_to_breakeven";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "priority", label: "Priority" },
  { key: "combined_score", label: "Score" },
  { key: "funding_diff_apr", label: "Funding APR" },
  { key: "hours_to_breakeven", label: "Breakeven" },
];

const STATUS_LABELS: Record<Exclude<StatusFilter, "all">, string> = {
  ready: "ready",
  watching: "watching",
  blocked: "blocked",
};

function sortItems(items: OpportunityItem[], sortKey: SortKey): OpportunityItem[] {
  return [...items].sort((a, b) => {
    if (sortKey === "priority") {
      const statusOrder = { ready: 0, watching: 1, blocked: 2 };
      const statusDelta = statusOrder[a.status] - statusOrder[b.status];
      if (statusDelta !== 0) {
        return statusDelta;
      }
      const correlatedA = a.correlated_with?.length ?? 0;
      const correlatedB = b.correlated_with?.length ?? 0;
      if (a.status === "ready" && correlatedA !== correlatedB) {
        return correlatedA - correlatedB;
      }
      return (b.combined_score ?? 0) - (a.combined_score ?? 0);
    }
    if (sortKey === "hours_to_breakeven") {
      if (a.hours_to_breakeven == null) return 1;
      if (b.hours_to_breakeven == null) return -1;
      return a.hours_to_breakeven - b.hours_to_breakeven;
    }
    return (b[sortKey] ?? 0) - (a[sortKey] ?? 0);
  });
}

function buildEmptyMessage(
  search: string,
  statusFilter: StatusFilter
): { title: string; description?: string } {
  const trimmedSearch = search.trim();
  const statusLabel = statusFilter !== "all" ? STATUS_LABELS[statusFilter] : null;

  if (trimmedSearch && statusLabel) {
    return {
      title: `No ${statusLabel} opportunities found`,
      description: `Nothing matching "${trimmedSearch}" in this status.`,
    };
  }
  if (trimmedSearch) {
    return { title: "No matches", description: `Nothing found for "${trimmedSearch}".` };
  }
  if (statusLabel) {
    return {
      title: `No ${statusLabel} opportunities`,
      description: "Try a different status filter.",
    };
  }
  return { title: "No opportunities" };
}

interface OpportunitiesListProps {
  items: OpportunityItem[];
  updatedAt: string | null;
  now: Date;
}
const OpportunitiesList = ({ items, updatedAt, now }: OpportunitiesListProps) => {
  const [sortKey, setSortKey] = useState<SortKey>("priority");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");

  const counts = useMemo(
    () => ({
      all: items.length,
      ready: items.filter((i) => i.status === "ready").length,
      watching: items.filter((i) => i.status === "watching").length,
      blocked: items.filter((i) => i.status === "blocked").length,
    }),
    [items]
  );

  const bySearch =
    search.trim() === ""
      ? items
      : items.filter((i) => i.symbol.toLowerCase().includes(search.trim().toLowerCase()));
  const byStatus =
    statusFilter === "all" ? bySearch : bySearch.filter((i) => i.status === statusFilter);
  const sorted = sortItems(byStatus, sortKey);
  const emptyMessage = buildEmptyMessage(search, statusFilter);
  const hiddenByFilter =
    sorted.length === 0 && statusFilter !== "all" && search.trim() === "" && counts.all > 0;

  return (
    <div>
      <div className={styles.controls}>
        <div className={styles.topRow}>
          <SymbolSearch value={search} onChange={setSearch} />
          <select
            className={styles.sortSelect}
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            aria-label="Sort opportunities by"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.key} value={opt.key}>
                Sort: {opt.label}
              </option>
            ))}
          </select>
        </div>
        <StatusFilterTabs value={statusFilter} onChange={setStatusFilter} counts={counts} />
      </div>
      {hiddenByFilter && (
        <div className={styles.filterHint}>
          <span>
            There are {counts.all} opportunities in total, but none in the{" "}
            {STATUS_LABELS[statusFilter as Exclude<StatusFilter, "all">]} filter.
          </span>
          <button
            type="button"
            className={styles.filterHintButton}
            onClick={() => setStatusFilter("all")}
          >
            Show all
          </button>
        </div>
      )}
      {sorted.length === 0 ? (
        <EmptyState title={emptyMessage.title} description={emptyMessage.description} />
      ) : (
        sorted.map((item) => {
          const longVenue = item.legs?.find((leg) => leg.side === "long")?.venue ?? "unknown";
          const shortVenue = item.legs?.find((leg) => leg.side === "short")?.venue ?? "unknown";
          return (
            <OpportunityCard
              key={`${item.symbol}-${longVenue}-${shortVenue}`}
              item={item}
              updatedAt={updatedAt}
              now={now}
            />
          );
        })
      )}
    </div>
  );
};

export default OpportunitiesList;
