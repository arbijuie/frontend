import styles from "./Tabs.module.scss";
import { useEffect, useRef } from "react";

interface TabItem {
  key: string;
  label: string;
}

interface TabsProps {
  tabs: TabItem[];
  activeKey: string;
  onChange: (key: string) => void;
}

const Tabs = ({ tabs, activeKey, onChange }: TabsProps) => {
  const activeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: "smooth", inline: "nearest", block: "nearest" });
  }, [activeKey]);

  return (
    <div className={styles.tabs} role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          ref={tab.key === activeKey ? activeRef : undefined}
          className={`${styles.tab} ${activeKey === tab.key ? styles.active : ""}`}
          onClick={() => onChange(tab.key)}
          role="tab"
          aria-selected={activeKey === tab.key}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};

export default Tabs;
