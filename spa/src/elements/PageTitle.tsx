import PropTypes, { InferProps } from 'prop-types';

const { Helmet } = require('react-helmet');

export type PageTitleProps = InferProps<typeof PageTitlePropTypes>;

const PageTitle = ({ title, hideRevEngine }: PageTitleProps) => {
  const pageTitle = `${title ? `${title} | ` : ''}RevEngine`;
  return (
    <Helmet>
      <title>{hideRevEngine ? title : pageTitle}</title>
    </Helmet>
  );
};

const PageTitlePropTypes = {
  title: PropTypes.string,
  hideRevEngine: PropTypes.bool
};

PageTitle.propTypes = PageTitlePropTypes;

PageTitle.defaultProps = {
  title: '',
  hideRevEngine: false
};

export default PageTitle;
