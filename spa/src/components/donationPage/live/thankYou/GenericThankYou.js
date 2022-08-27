import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import * as S from './GenericThankYou.styled';
import SegregatedStyles from 'components/donationPage/SegregatedStyles';
import fbLogo from 'assets/images/fb_logo.png';
import twLogo from 'assets/images/twitter_logo.png';
import { faEnvelope } from '@fortawesome/free-solid-svg-icons';
import { useAnalyticsContext } from 'components/analytics/AnalyticsContext';
import { HUB_GA_V3_ID } from 'settings';
import DonationPageNavbar from 'components/donationPage/DonationPageNavbar';
import DonationPageFooter from 'components/donationPage/DonationPageFooter';

function buildFacebookHref(donationPageUrl) {
  const baseUrl = 'https://www.facebook.com/sharer/sharer.php?';
  const search = `u=${donationPageUrl}`;
  return baseUrl + search;
}

function buildTwitterHref(page, donationPageUrl) {
  const baseUrl = 'https://twitter.com/intent/tweet?';
  const twitterHandle = page.revenue_program.twitter_handle;
  const revProgramName = page.revenue_program.name;
  const revProgramHandle = twitterHandle ? `@${twitterHandle}` : revProgramName;
  const message = `I support ${revProgramHandle}. You should too. ${donationPageUrl} @fundjournalism`;
  return baseUrl + `text=${message}`;
}

function buildEmailHref(page, donationPageUrl) {
  const rpName = page?.revenue_program?.name;
  const subject = `You should really check out ${rpName}`;
  const body = `I just gave to ${rpName}, and I think you should too: ${donationPageUrl}%0D%0AIf you're not familiar with \
    ${rpName}'s work, you can sign up for their newsletter here: ${page?.revenue_program?.website_url}%0D%0A %0D%0ASincerely,\
    %0D%0A %0D%0A %0D%0AContribute today: ${donationPageUrl}`;
  return `mailto:?subject=${subject}&body=${body}`;
}

function GenericThankYou() {
  const {
    state: { frequency, amount, email, donationPageUrl, page }
  } = useLocation();

  const { setAnalyticsConfig, analyticsInstance } = useAnalyticsContext();

  // Thank you page won't have a parent component that has set up analytics
  // instance, so we set up here, which has side effect of tracking a page view.
  useEffect(() => {
    if (!analyticsInstance) {
      setAnalyticsConfig({
        hubGaV3Id: HUB_GA_V3_ID,
        orgGaV3Id: page?.revenue_program?.google_analytics_v3_id,
        orgGaV3Domain: page?.revenue_program?.google_analytics_v3_domain,
        orgGaV4Id: page?.revenue_program?.google_analytics_v4_id,
        orgFbPixelId: page?.revenue_program?.facebook_pixel_id
      });
    }
  }, [
    analyticsInstance,
    setAnalyticsConfig,
    page?.revenue_program?.google_analytics_v3_id,
    page?.revenue_program?.google_analytics_v3_domain,
    page?.revenue_program?.google_analytics_v4_id,
    page?.revenue_program?.facebook_pixel_id
  ]);

  const handleRedirect = () => {
    window.open(page?.post_thank_you_redirect, '_self');
  };

  return (
    <SegregatedStyles page={page}>
      <S.GenericThankYou data-testid="generic-thank-you">
        <DonationPageNavbar page={page} />
        <S.Wrapper>
          <S.InnerContent>
            <S.TextSection>
              <S.ThankYou>Thank You</S.ThankYou>
              <S.Text>
                Your <strong>{frequency}</strong> contribution of <strong>${amount}</strong> to{' '}
                {page?.revenue_program?.name} has been received.
              </S.Text>
              <S.Text>
                A receipt will be sent to <strong>{email}</strong> shortly.
              </S.Text>
              {page?.revenue_program_is_nonprofit && (
                <S.Text>Contributions or gifts to {page?.revenue_program?.name} are tax deductible.</S.Text>
              )}
            </S.TextSection>
            <S.SocialShareSection>
              <S.Text>
                <strong>Share your support on social media:</strong>
              </S.Text>
              <S.SocialShareList>
                <S.SocialShareItem>
                  <S.FacebookShare href={buildFacebookHref(donationPageUrl)} target="_blank" rel="noreferrer">
                    <S.SocialImg src={fbLogo} /> Share
                  </S.FacebookShare>
                </S.SocialShareItem>
                <S.SocialShareItem>
                  <S.TwitterShare href={buildTwitterHref(page, donationPageUrl)} target="_blank" rel="noreferrer">
                    <S.SocialImg src={twLogo} /> Tweet
                  </S.TwitterShare>
                </S.SocialShareItem>
                <S.SocialShareItem>
                  <S.EmailShare href={buildEmailHref(page, donationPageUrl)} target="_blank" rel="noreferrer">
                    <S.SocialIcon icon={faEnvelope} /> Email
                  </S.EmailShare>
                </S.SocialShareItem>
              </S.SocialShareList>
            </S.SocialShareSection>
            {page?.post_thank_you_redirect && <S.Redirect onClick={handleRedirect}>Return to website</S.Redirect>}
          </S.InnerContent>
        </S.Wrapper>
        <DonationPageFooter page={page} />
      </S.GenericThankYou>
    </SegregatedStyles>
  );
}

export default GenericThankYou;
