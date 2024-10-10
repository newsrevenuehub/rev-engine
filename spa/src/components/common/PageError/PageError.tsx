import { useEffect } from 'react';

// Analytics
import { useAnalyticsContext } from 'components/analytics/AnalyticsContext';
import { HUB_GA_V3_ID } from 'appSettings';
import PropTypes from 'prop-types';
import { Description, PageErrorWrapper, StatusCode, Wrapper } from './PageError.styled';

export const FUNDJOURNALISM_404_REDIRECT = 'https://fundjournalism.org/?utm_campaign=404#donate';

const PageErrorPropTypes = {
  showRedirect: PropTypes.bool,
  statusCode: PropTypes.number,
  errorMessage: PropTypes.string
};

export type PageErrorProps = PropTypes.InferProps<typeof PageErrorPropTypes>;

function PageError({
  showRedirect = false,
  statusCode,
  errorMessage = 'Something went wrong. Please try again later.'
}: PageErrorProps) {
  const { setAnalyticsConfig } = useAnalyticsContext();

  useEffect(() => {
    setAnalyticsConfig({ hubGaV3Id: HUB_GA_V3_ID });
  }, [setAnalyticsConfig]);

  return (
    <PageErrorWrapper data-testid="page-error">
      <Wrapper>
        {statusCode && <StatusCode>404</StatusCode>}
        <Description>
          <p>{errorMessage}</p>
          {showRedirect && (
            <p>
              If you’re trying to make a contribution please visit <a href={FUNDJOURNALISM_404_REDIRECT}>this page</a>.
            </p>
          )}
        </Description>
      </Wrapper>
    </PageErrorWrapper>
  );
}

PageError.propTypes = PageErrorPropTypes;

export default PageError;
