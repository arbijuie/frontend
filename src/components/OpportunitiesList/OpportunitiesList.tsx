import styles from "./OpportunitiesList.module.scss";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import type { OpportunityItem } from "../../api/types";
import OpportunityCard from "../OpportunityCard/OpportunityCard";
import SymbolSearch from "../SymbolSearch/SymbolSearch";
import EmptyState from "../EmptyState/EmptyState";
import { SORT_OPTIONS, type SortKey, type StatusFilter } from "../../lib/opportunitiesUrlState";

const SEARCH_DEBOUNCE_MS = 300;

const STATUS_LABELS: Record<Exclude<StatusFilter, "all">, string> = {
  ready: "ready",
  watching: "watching",
  blocked: "blocked",
};

const STATUS_EMPTY_TITLES: Record<Exclude<StatusFilter, "all">, string> = {
  ready: "No deals are ready right now",
  watching: "No deals are on watch right now",
  blocked: "No deals are blocked right now",
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
  if (statusFilter !== "all") {
    return {
      title: STATUS_EMPTY_TITLES[statusFilter],
      description: "Tap All deals above to see everything.",
    };
  }
  return { title: "No deals" };
}

function CollapsedGroup({
  title,
  hint,
  items,
  render,
}: {
  title: string;
  hint: string;
  items: OpportunityItem[];
  render: (list: OpportunityItem[]) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  if (items.length === 0) return null;
  return (
    <section className={styles.group}>
      <button
        type="button"
        className={styles.groupToggle}
        aria-expanded={open}
        aria-label={`${open ? "Hide" : "Show"} ${title.toLowerCase()} deals (${items.length})`}
        onClick={() => setOpen(!open)}
      >
        <span>
          {title} ({items.length})
        </span>
        <span aria-hidden="true">{open ? "▲" : "▼"}</span>
      </button>
      {!open && <p className={styles.groupHint}>{hint}</p>}
      {open && render(items)}
    </section>
  );
}

interface OpportunitiesListProps {
  items: OpportunityItem[];
  updatedAt: string | null;
  now: Date;
  sortKey: SortKey;
  onSortKeyChange: (key: SortKey) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (filter: StatusFilter) => void;
  search: string;
  onSearchChange: (search: string) => void;
  onExecute?: (item: OpportunityItem) => void;
}

const OpportunitiesList = ({
  items,
  updatedAt,
  now,
  sortKey,
  onSortKeyChange,
  statusFilter,
  onStatusFilterChange,
  search,
  onSearchChange,
  onExecute,
}: OpportunitiesListProps) => {
  const [searchDraft, setSearchDraft] = useState(search);
  const [prevSearchProp, setPrevSearchProp] = useState(search);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (search !== prevSearchProp) {
    setPrevSearchProp(search);
    setSearchDraft(search);
  }

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const handleSearchChange = (value: string) => {
    setSearchDraft(value);
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      onSearchChange(value);
    }, SEARCH_DEBOUNCE_MS);
  };

  const totalCount = items.length;
  const bySearch =
    searchDraft.trim() === ""
      ? items
      : items.filter((i) => i.symbol.toLowerCase().includes(searchDraft.trim().toLowerCase()));
  const byStatus =
    statusFilter === "all" ? bySearch : bySearch.filter((i) => i.status === statusFilter);
  const sorted = sortItems(byStatus, sortKey);
  const emptyMessage = buildEmptyMessage(searchDraft, statusFilter);
  const groupByStatus = statusFilter === "all" && sortKey === "priority";
  const renderCards = (list: OpportunityItem[]) =>
    list.map((item) => {
      const longVenue = item.legs?.find((leg) => leg.side === "long")?.venue ?? "unknown";
      const shortVenue = item.legs?.find((leg) => leg.side === "short")?.venue ?? "unknown";
      return (
        <OpportunityCard
          key={`${item.symbol}-${longVenue}-${shortVenue}`}
          item={item}
          updatedAt={updatedAt}
          now={now}
          onExecute={onExecute}
        />
      );
    });
  const hiddenByFilter =
    sorted.length === 0 && statusFilter !== "all" && searchDraft.trim() === "" && totalCount > 0;

  return (
    <div>
      <div className={styles.controls}>
        <div className={styles.topRow}>
          <SymbolSearch value={searchDraft} onChange={handleSearchChange} />
          <select
            className={styles.sortSelect}
            value={sortKey}
            onChange={(e) => onSortKeyChange(e.target.value as SortKey)}
            aria-label="Sort deals by"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.key} value={opt.key}>
                Sort: {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      {hiddenByFilter && (
        <div className={styles.filterHint}>
          <span>
            There are {totalCount} opportunities in total, but none in the{" "}
            {STATUS_LABELS[statusFilter as Exclude<StatusFilter, "all">]} filter.
          </span>
          <button
            type="button"
            className={styles.filterHintButton}
            onClick={() => onStatusFilterChange("all")}
          >
            Show all
          </button>
        </div>
      )}
      {sorted.length === 0 ? (
        <EmptyState title={emptyMessage.title} description={emptyMessage.description} />
      ) : groupByStatus ? (
        <>
          {renderCards(sorted.filter((i) => i.status === "ready"))}
          <CollapsedGroup
            title="On watch"
            hint="Almost good enough. We keep checking them."
            items={sorted.filter((i) => i.status === "watching")}
            render={renderCards}
          />
          <CollapsedGroup
            title="Blocked"
            hint="Cannot be opened right now. Open a deal to see why."
            items={sorted.filter((i) => i.status === "blocked")}
            render={renderCards}
          />
        </>
      ) : (
        renderCards(sorted)
      )}
    </div>
  );
};

export default OpportunitiesList;
