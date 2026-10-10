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

const Tabs = ({ tabs, activeKey, onChange, label, idPrefix }: TabsProps) => {
  const generatedPrefix = useId();
  const prefix = idPrefix ?? generatedPrefix;
  const activeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({
      behavior: prefersReducedMotion() ? "auto" : "smooth",
      inline: "nearest",
      block: "nearest",
    });
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
          aria-selected={activeKey === tab.key}
          aria-controls={tabPanelId(prefix, tab.key)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};

export default Tabs;
