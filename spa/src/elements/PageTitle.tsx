import PropTypes, { InferProps } from 'prop-types';
import { Helmet } from 'react-helmet';

export type PageTitleProps = InferProps<typeof PageTitlePropTypes>;

const PageTitle = ({ title = '', hideRevEngine = false }: PageTitleProps) => {
  const revEngineTitle = `${title ? `${title} | ` : ''}RevEngine`;
  return (
    <Helmet>
      <title>{hideRevEngine ? title : revEngineTitle}</title>
    </Helmet>
  );
};

const PageTitlePropTypes = {
  title: PropTypes.string,
  hideRevEngine: PropTypes.bool
};

PageTitle.propTypes = PageTitlePropTypes;

export default PageTitle;
