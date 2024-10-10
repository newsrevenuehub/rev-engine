import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { HUB_GA_V3_ID } from 'appSettings';
import { useAnalyticsContext } from 'components/analytics/AnalyticsContext';
import { GlobalLoading } from 'components/common/GlobalLoading';
import PageError from 'components/common/PageError/PageError';
import DonationPage from 'components/donationPage/DonationPage';
import SegregatedStyles from 'components/donationPage/SegregatedStyles';
import PageTitle from 'elements/PageTitle';
import { usePublishedPage } from 'hooks/usePublishedPage';
import useWebFonts from 'hooks/useWebFonts';
import ContributionPage18nProvider from './ContributionPageI18nProvider';
import { getRevenueProgramSlug } from 'utilities/getRevenueProgramSlug';

interface RouteParams {
  pageSlug: string;
}

function PublishedDonationPage() {
  const rpSlug = getRevenueProgramSlug();
  const { pageSlug } = useParams<RouteParams>();
  const { isError, isLoading, page } = usePublishedPage(rpSlug, pageSlug);
  const { setAnalyticsConfig } = useAnalyticsContext();
  const { t } = useTranslation();

  useWebFonts(page?.styles?.font);
  useEffect(() => {
    if (page?.revenue_program) {
      const {
        google_analytics_v3_id: orgGaV3Id,
        google_analytics_v3_domain: orgGaV3Domain,
        google_analytics_v4_id: orgGaV4Id,
        facebook_pixel_id: orgFbPixelId
      } = page.revenue_program;

      setAnalyticsConfig({ hubGaV3Id: HUB_GA_V3_ID, orgGaV3Id, orgGaV3Domain, orgGaV4Id, orgFbPixelId });
    }
  }, [page?.revenue_program, setAnalyticsConfig]);

  if (isError) {
    return <PageError showRedirect statusCode={404} errorMessage="The page you requested can't be found." />;
  }

  if (isLoading || !page) {
    return <GlobalLoading />;
  }

  // Added in DEV-4225; we see some browsers getting an undefined
  // revenue_program on the page, but trying to make the same API request
  // ourselves shows a normal revenue_program property. Adding logging around
  // this to try to understand what's going on.

  if (!page.revenue_program) {
    console.error(`Page object has no revenue_program.name property: ${JSON.stringify(page)}`);
    return <PageError showRedirect statusCode={404} errorMessage="The page you requested can't be found." />;
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
