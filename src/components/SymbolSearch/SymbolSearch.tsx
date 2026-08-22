import styles from './SymbolSearch.module.scss';

interface SymbolSearchProps {
  value: string;
  onChange: (value: string) => void;
}

const SymbolSearch = ({ value, onChange }: SymbolSearchProps) => {
  return (
    <div className={styles.wrapper}>
      <span className={styles.icon}>⌕</span>
      <input
        className={styles.input}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search symbol..."
        aria-label="Search by symbol"
      />
    </div>
  );
};

export default SymbolSearch;
