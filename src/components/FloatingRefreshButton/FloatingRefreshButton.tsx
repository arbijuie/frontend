import styles from './FloatingRefreshButton.module.scss';

interface FloatingRefreshButtonProps {
  fetching: boolean;
  onClick: () => void;
}

const FloatingRefreshButton = ({ fetching, onClick }: FloatingRefreshButtonProps) => {
  return (
    <button
      className={styles.fab}
      onClick={onClick}
      disabled={fetching}
      aria-label="Refresh opportunities"
    >
      <span className={fetching ? styles.spinning : ''}>↻</span>
    </button>
  );
};

export default FloatingRefreshButton;
