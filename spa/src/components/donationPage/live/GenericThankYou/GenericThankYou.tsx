import { Redirect, useLocation } from 'react-router-dom';
import { HUB_GA_V3_ID } from 'appSettings';
import { Link } from 'components/base';
import SegregatedStyles from 'components/donationPage/SegregatedStyles';
import { useAnalyticsContext } from 'components/analytics/AnalyticsContext';
import DonationPageNavbar from 'components/donationPage/DonationPageNavbar';
import DonationPageFooter from 'components/donationPage/DonationPageFooter';
import { ContributionPage } from 'hooks/useContributionPage';
import PostContributionSharing from '../PostContributionSharing';
import { Header, InnerContent, Root, Text, Wrapper } from './GenericThankYou.styled';
import { useEffect } from 'react';

/**
 * State that PaymentSuccess will put into router state for us. However, it's
 * possible that none of these will be set for us (e.g. the user bookmarks the
 * thank you page and returns to it late, or sends the URL to someone else).
 */
interface GenericThankYouRouteState {
  /**
   * Contribution amount.
   */
  amount?: number;
  /**
   * URL of the donation page the user used.
   */
  donationPageUrl?: string;
  /**
   * Email the contributor entered.
   */
  email?: string;
  /**
   * English description of the contribution frequency the contributor chose.
   */
  frequencyText?: string;
  /**
   * Contribution page the user used.
   */
  page?: ContributionPage;
}

function GenericThankYou() {
  // Using the useLocation<GenericThankYouRouteState>() doesn't seem to type the
  // result correctly. Probably fixed in a later version of react-router-dom.
  const routedState = useLocation().state as GenericThankYouRouteState;
  const { analyticsInstance, setAnalyticsConfig } = useAnalyticsContext();

  // Set up analytics if we haven't already. This has to be an effect because
  // we're changing a parent component's state (AnalyticsContextProvider).

  useEffect(() => {
    if (!analyticsInstance && routedState.page?.revenue_program) {
      const { revenue_program } = routedState.page;
      const coerceNullToUndefined = (value: string | null) => (value === null ? undefined : value);

      // Coerce null values to undefined.

      setAnalyticsConfig({
        hubGaV3Id: HUB_GA_V3_ID,
        orgFbPixelId: coerceNullToUndefined(revenue_program.facebook_pixel_id),
        orgGaV3Domain: coerceNullToUndefined(revenue_program.google_analytics_v3_domain),
        orgGaV3Id: coerceNullToUndefined(revenue_program.google_analytics_v3_id),
        orgGaV4Id: coerceNullToUndefined(revenue_program.google_analytics_v4_id)
      });
    }
  }, [analyticsInstance, routedState.page, setAnalyticsConfig]);

  // If the state we need doesn't exist, redirect to the parent donation page.
  // This takes advantage of the fact that our routing structure is
  // donation-page-slug/thank-you/.

  if (
    !routedState.amount ||
    !routedState.donationPageUrl ||
    !routedState.email ||
    !routedState.frequencyText ||
    !routedState.page
  ) {
    return <Redirect to="../" />;
  }

  // This only handles CAD and USD correctly, most likely. If we begin
  // supporting other currencies, this will need to be changed.

  const formattedAmount = `${routedState.page.currency?.symbol ?? '$'}${routedState?.amount} ${
    routedState.page.currency?.code ?? ''
  }`;

  return (
    <SegregatedStyles page={routedState.page}>
      <Root data-testid="generic-thank-you">
        <DonationPageNavbar page={routedState.page} />
        <Wrapper>
          <InnerContent>
            <div>
              <Header>Thank You</Header>
              <Text data-testid="contribution">
                Your <strong>{routedState.frequencyText}</strong> contribution of <strong>{formattedAmount}</strong> to{' '}
                {routedState.page.revenue_program.name} has been received.
              </Text>
              <Text data-testid="receipt">
                A receipt will be sent to <strong>{routedState.email}</strong> shortly.
              </Text>
              {routedState.page.revenue_program_is_nonprofit && (
                <Text>Contributions or gifts to {routedState?.page.revenue_program.name} are tax deductible.</Text>
              )}
            </div>
            <PostContributionSharing
              donationPageUrl={routedState.donationPageUrl}
              revenueProgram={routedState.page.revenue_program}
            />
            {routedState.page.post_thank_you_redirect && (
              <Link href={routedState.page.post_thank_you_redirect}>Return to website</Link>
            )}
          </InnerContent>
        </Wrapper>
        <DonationPageFooter page={routedState?.page} />
      </Root>
    </SegregatedStyles>
  );
}

export default GenericThankYou;
