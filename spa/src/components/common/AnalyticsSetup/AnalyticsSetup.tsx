import { HUB_GA_V3_ID } from 'appSettings';
import { useAnalyticsContext } from 'components/analytics/AnalyticsContext';
import PropTypes from 'prop-types';
import { useEffect } from 'react';

const AnalyticsSetupPropTypes = {
  children: PropTypes.node
};

export type AnalyticsSetupProps = PropTypes.InferProps<typeof AnalyticsSetupPropTypes>;

function AnalyticsSetup({ children }: AnalyticsSetupProps) {
  const { setAnalyticsConfig } = useAnalyticsContext();

  useEffect(() => {
    setAnalyticsConfig({ hubGaV3Id: HUB_GA_V3_ID });
  }, [setAnalyticsConfig]);

  return <>{children}</>;
}

AnalyticsSetup.propTypes = AnalyticsSetupPropTypes;

export default AnalyticsSetup;
