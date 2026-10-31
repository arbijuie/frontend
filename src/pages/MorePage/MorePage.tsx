import { Link } from "react-router-dom";
import styles from "./MorePage.module.scss";
import PageHeader from "../../components/PageHeader/PageHeader";
import { usePageTitle } from "../../hooks/usePageTitle";
import { MORE_SECTIONS } from "../../lib/navigation";

const MorePage = () => {
  usePageTitle("More");

  return (
    <div className={styles.page}>
      <PageHeader title="More" />
      {MORE_SECTIONS.map((section) => (
        <section key={section.title} className={styles.section} aria-label={section.title}>
          <h2 className={styles.sectionTitle}>{section.title}</h2>
          <ul className={styles.list}>
            {section.items.map(({ to, label, description, icon: Icon }) => (
              <li key={to}>
                <Link to={to} className={styles.row}>
                  <Icon className={styles.icon} aria-hidden="true" />
                  <span>
                    <span className={styles.label}>{label}</span>
                    <span className={styles.description}>{description}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
};

export default MorePage;
