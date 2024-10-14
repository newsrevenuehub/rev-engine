import { HUB_GA_V3_ID } from 'appSettings';
import { useAnalyticsContext } from 'components/analytics/AnalyticsContext';
import PropTypes from 'prop-types';
import { useEffect } from 'react';
import { Description, Header, PageErrorWrapper, Wrapper } from './PageError.styled';

const PageErrorPropTypes = {
  header: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  description: PropTypes.node
};

export type PageErrorProps = PropTypes.InferProps<typeof PageErrorPropTypes>;

function PageError({ header, description = 'Something went wrong. Please try again later.' }: PageErrorProps) {
  const { setAnalyticsConfig } = useAnalyticsContext();

  useEffect(() => {
    setAnalyticsConfig({ hubGaV3Id: HUB_GA_V3_ID });
  }, [setAnalyticsConfig]);

  return (
    <PageErrorWrapper data-testid="page-error">
      <Wrapper>
        {header && <Header>{header}</Header>}
        <Description>{description}</Description>
      </Wrapper>
    </PageErrorWrapper>
  );
}

PageError.propTypes = PageErrorPropTypes;

export default PageError;
