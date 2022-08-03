const { Helmet } = require('react-helmet');

const PageTitle = ({ title = '' }) => {
  const pageTitle = `${title ? `${title} | ` : ''}RevEngine`;
  return (
    <Helmet>
      <title>{pageTitle}</title>
    </Helmet>
  );
};

export default PageTitle;
