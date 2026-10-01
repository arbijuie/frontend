import { useEffect, useId, useRef, useState } from "react";
import styles from "./HelpTooltip.module.scss";

interface HelpTooltipProps {
  text: string;
}

const HelpTooltip = ({ text }: HelpTooltipProps) => {
  const [open, setOpen] = useState(false);
  const tooltipId = useId();
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;

    function handleOutside(event: MouseEvent | TouchEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return (
    <span className={styles.wrapper} ref={containerRef}>
      <button
        type="button"
        className={styles.helpDot}
        title={text}
        aria-expanded={open}
        aria-describedby={open ? tooltipId : undefined}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((prev) => !prev);
        }}
      >
        ?
      </button>
      {open && (
        <span role="tooltip" id={tooltipId} className={styles.bubble}>
          {text}
        </span>
      )}
    </span>
  );
};

export default HelpTooltip;
