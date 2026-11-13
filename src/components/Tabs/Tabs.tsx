import styles from "./Tabs.module.scss";
import { useEffect, useId, useRef, type KeyboardEvent } from "react";
import { prefersReducedMotion } from "../../lib/prefersReducedMotion";
import { tabId, tabPanelId } from "../../lib/tabIds";

interface TabItem {
  key: string;
  label: string;
}

interface TabsProps {
  tabs: TabItem[];
  activeKey: string;
  onChange: (key: string) => void;
  label?: string;
  idPrefix?: string;
}

/** Keep the active tab visible inside the overflow strip without scrolling the page. */
function scrollTabIntoStrip(tab: HTMLElement) {
  const tablist = tab.parentElement;
  if (!tablist) return;

  const tablistRect = tablist.getBoundingClientRect();
  const tabRect = tab.getBoundingClientRect();
  let delta = 0;
  if (tabRect.left < tablistRect.left) {
    delta = tabRect.left - tablistRect.left;
  } else if (tabRect.right > tablistRect.right) {
    delta = tabRect.right - tablistRect.right;
  }
  if (delta === 0) return;

  const behavior = prefersReducedMotion() ? "auto" : "smooth";
  if (typeof tablist.scrollBy === "function") {
    tablist.scrollBy({ left: delta, behavior });
    return;
  }
  tablist.scrollLeft += delta;
}

const Tabs = ({ tabs, activeKey, onChange, label, idPrefix }: TabsProps) => {
  const generatedPrefix = useId();
  const prefix = idPrefix ?? generatedPrefix;
  const activeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (activeRef.current) {
      scrollTabIntoStrip(activeRef.current);
    }
  }, [activeKey]);

  const focusAndSelect = (index: number) => {
    const nextTab = tabs[index];
    onChange(nextTab.key);
    document.getElementById(tabId(prefix, nextTab.key))?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") {
      return;
    }
    event.preventDefault();
    const direction = event.key === "ArrowRight" ? 1 : -1;
    focusAndSelect((index + direction + tabs.length) % tabs.length);
  };

  return (
    <div className={styles.tabs} role="tablist" aria-label={label}>
      {tabs.map((tab, index) => (
        <button
          key={tab.key}
          id={tabId(prefix, tab.key)}
          ref={tab.key === activeKey ? activeRef : undefined}
          className={`${styles.tab} ${activeKey === tab.key ? styles.active : ""}`}
          onClick={() => onChange(tab.key)}
          onKeyDown={(event) => handleKeyDown(event, index)}
          role="tab"
          aria-selected={tab.key === activeKey}
          aria-controls={tabPanelId(prefix, tab.key)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};

export default Tabs;
