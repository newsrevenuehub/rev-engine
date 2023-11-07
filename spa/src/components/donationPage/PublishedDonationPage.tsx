import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { HUB_GA_V3_ID } from 'appSettings';
import { useAnalyticsContext } from 'components/analytics/AnalyticsContext';
import LivePage404 from 'components/common/LivePage404';
import DonationPage from 'components/donationPage/DonationPage';
import SegregatedStyles from 'components/donationPage/SegregatedStyles';
import PageTitle from 'elements/PageTitle';
import { usePublishedPage } from 'hooks/usePublishedPage';
import useSubdomain from 'hooks/useSubdomain';
import useWebFonts from 'hooks/useWebFonts';
import ContributionPage18nProvider from './ContributionPageI18nProvider';
import GlobalLoading from 'elements/GlobalLoading';

interface RouteParams {
  pageSlug: string;
}

function PublishedDonationPage() {
  const subdomain = useSubdomain();
  const { pageSlug } = useParams<RouteParams>();
  const { isError, isLoading, page } = usePublishedPage(subdomain, pageSlug);
  const { setAnalyticsConfig } = useAnalyticsContext();
  const { t } = useTranslation();

  useWebFonts(page?.styles?.font);
  useEffect(() => {
    if (page) {
      const {
        google_analytics_v3_id: orgGaV3Id,
        google_analytics_v3_domain: orgGaV3Domain,
        google_analytics_v4_id: orgGaV4Id,
        facebook_pixel_id: orgFbPixelId
      } = page.revenue_program;

      setAnalyticsConfig({ hubGaV3Id: HUB_GA_V3_ID, orgGaV3Id, orgGaV3Domain, orgGaV4Id, orgFbPixelId });
    }
  }, [page, setAnalyticsConfig]);

  if (isError) {
    return <LivePage404 dashboard={false} />;
  }

  if (isLoading || !page) {
    return <GlobalLoading />;
  }

  return (
    <SegregatedStyles page={page}>
      <PageTitle title={t('common.joinRevenueProgram', { name: page.revenue_program.name })} hideRevEngine />
      <ContributionPage18nProvider page={page}>
        <DonationPage live page={page} />
      </ContributionPage18nProvider>
    </SegregatedStyles>
  );
}

export default PublishedDonationPage;
