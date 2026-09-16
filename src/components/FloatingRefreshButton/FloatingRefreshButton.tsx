import styles from "./FloatingRefreshButton.module.scss";

interface FloatingRefreshButtonProps {
  fetching: boolean;
  onClick: () => void;
  label?: string;
}

const FloatingRefreshButton = ({
  fetching,
  onClick,
  label = "Refresh opportunities",
}: FloatingRefreshButtonProps) => {
  return (
    <button className={styles.fab} onClick={onClick} disabled={fetching} aria-label={label}>
      <span className={fetching ? styles.spinning : ""}>↻</span>
    </button>
  );
};

export default FloatingRefreshButton;
