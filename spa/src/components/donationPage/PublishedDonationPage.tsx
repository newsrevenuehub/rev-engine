import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { HUB_RECAPTCHA_API_KEY, HUB_GA_V3_ID } from 'appSettings';
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
import { FUNDJOURNALISM_404_REDIRECT } from 'constants/helperUrls';
import { GoogleReCaptchaProvider } from 'react-google-recaptcha-v3';

interface RouteParams {
  pageSlug: string;
}

const pageError = {
  header: 404,
  description: (
    <>
      <p>The page you requested can't be found.</p>
      <p>
        If you're trying to make a contribution please visit <a href={FUNDJOURNALISM_404_REDIRECT}>this page</a>.
      </p>
    </>
  )
};

function PublishedDonationPage() {
  const rpSlug = getRevenueProgramSlug();
  const { pageSlug } = useParams<RouteParams>();
  const { isError, isLoading, page, isFetched } = usePublishedPage(rpSlug, pageSlug);
  const { setAnalyticsConfig } = useAnalyticsContext();
  const { t } = useTranslation();

  useWebFonts(page?.styles?.font);
  useEffect(() => {
    if (isFetched) {
      setAnalyticsConfig({
        hubGaV3Id: HUB_GA_V3_ID,
        ...(page?.revenue_program && {
          orgGaV3Id: page.revenue_program.google_analytics_v3_id,
          orgGaV3Domain: page.revenue_program.google_analytics_v3_domain,
          orgGaV4Id: page.revenue_program.google_analytics_v4_id,
          orgFbPixelId: page.revenue_program.facebook_pixel_id
        })
      });
    }
  }, [isFetched, page?.revenue_program, setAnalyticsConfig]);

  if (isError) {
    return <PageError {...pageError} />;
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
    return <PageError {...pageError} />;
  }

  return (
    <SegregatedStyles page={page}>
      <PageTitle title={t('common.joinRevenueProgram', { name: page.revenue_program.name })} hideRevEngine />
      <GoogleReCaptchaProvider reCaptchaKey={HUB_RECAPTCHA_API_KEY} scriptProps={{ nonce: (window as any).csp_nonce }}>
        <ContributionPage18nProvider page={page}>
          <DonationPage live page={page} />
        </ContributionPage18nProvider>
      </GoogleReCaptchaProvider>
    </SegregatedStyles>
  );
}

export default PublishedDonationPage;
