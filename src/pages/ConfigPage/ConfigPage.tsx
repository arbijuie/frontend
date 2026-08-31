import styles from "../../pages/OpportunitiesPage/OpportunitiesPage.module.scss";
import { useConfig } from "../../hooks/useConfig";
import PresetComparison from "../../components/PresetComparison/PresetComparison";
import ConfigAccordion from "../../components/ConfigAccordion/ConfigAccordion";

const ConfigPage = () => {
  const { data, error, loading } = useConfig();

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Config</h1>

      {error && <div className={styles.errorBox}>Error: {error}</div>}
      {loading && !data && <div>Loading config...</div>}

      {data && (
        <>
          <h2 className={styles.sectionTitle}>Live Configuration</h2>
          <ConfigAccordion config={data} />
          <h2 className={styles.sectionTitle}>Presets</h2>
          <PresetComparison config={data} />
        </>
      )}
    </div>
  );
};

export default ConfigPage;
