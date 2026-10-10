import pageStyles from "../../styles/Page.module.scss";
import PageHeader from "../../components/PageHeader/PageHeader";
import { usePageTitle } from "../../hooks/usePageTitle";

interface PublicPlaceholderPageProps {
  title: string;
  description: string;
}

const PublicPlaceholderPage = ({ title, description }: PublicPlaceholderPageProps) => {
  usePageTitle(title);

  return (
    <div className={pageStyles.page}>
      <PageHeader title={title} />
      <p className={pageStyles.hint}>{description}</p>
    </div>
  );
};

export default PublicPlaceholderPage;
