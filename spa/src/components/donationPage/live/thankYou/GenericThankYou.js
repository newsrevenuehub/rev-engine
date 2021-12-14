import * as S from './GenericThankYou.styled';
import SegregatedStyles from 'components/donationPage/SegregatedStyles';

// Assets
import fbLogo from 'assets/images/fb_logo.png';
import twLogo from 'assets/images/twitter_logo.png';
import { faEnvelope } from '@fortawesome/free-solid-svg-icons';

// Router
import { useLocation } from 'react-router-dom';
import { useEffect } from 'react';

// Analytics
import { useAnalyticsContext } from 'components/analytics/AnalyticsContext';
import { HUB_GA_V3_ID } from 'settings';

// Children
import DonationPageNavbar from 'components/donationPage/DonationPageNavbar';
import DonationPageFooter from 'components/donationPage/DonationPageFooter';

function GenericThankYou() {
  const { state: routedState } = useLocation();
  const { setAnalyticsConfig } = useAnalyticsContext();
  const orgGaV3Domain = routedState?.page?.revenue_program?.google_analytics_v3_domain;
  const orgGaV3Id = routedState?.page?.revenue_program?.google_analytics_v3_id;
  const orgGaV4Id = routedState?.page?.revenue_program?.google_analytics_v4_id;
  const orgFbPixelId = routedState?.page?.revenue_program?.facebook_pixel_id;

  useEffect(() => {
    setAnalyticsConfig({ hubGaV3Id: HUB_GA_V3_ID, orgGaV3Id, orgGaV3Domain, orgGaV4Id, orgFbPixelId });
  }, [orgGaV3Domain, orgGaV3Id, orgGaV4Id, orgFbPixelId]);

  const handleRedirect = () => {
    window.open(routedState?.page?.post_thank_you_redirect, '_self');
  };

  const buildFacebookHref = () => {
    const baseUrl = 'https://www.facebook.com/sharer/sharer.php?';
    const search = `u=${routedState?.donationPageUrl}`;
    return baseUrl + search;
  };

  const buildTwitterHref = () => {
    const baseUrl = 'https://twitter.com/intent/tweet?';
    const twitterHandle = routedState?.page.revenue_program.twitter_handle;
    const revProgramName = routedState?.page.revenue_program.name;
    const revProgramHandle = twitterHandle ? `@${twitterHandle}` : revProgramName;
    const message = `I support ${revProgramHandle}. You should too. ${routedState?.donationPageUrl} @fundjournalism`;
    return baseUrl + `text=${message}`;
  };

  const buildEmailHref = () => {
    const revProgramName = routedState?.page.revenue_program.name;
    const donationPageUrl = routedState?.donationPageUrl;
    const revProgramWebsite = routedState?.page.revenue_program.website_url;
    const subject = `You should really check out ${revProgramName}`;
    const body = `I just gave to ${revProgramName}, and I think you should too: ${donationPageUrl}%0D%0AIf you're not familiar with ${revProgramName}'s work, you can sign up for their newsletter here: ${revProgramWebsite}%0D%0A %0D%0ASincerely,%0D%0A %0D%0A %0D%0AContribute today: ${donationPageUrl}`;
    return `mailto:?subject=${subject}&body=${body}`;
  };

  return (
    <SegregatedStyles page={routedState?.page}>
      <S.GenericThankYou data-testid="generic-thank-you">
        <DonationPageNavbar page={routedState?.page} />
        <S.Wrapper>
          <S.InnerContent>
            <S.TextSection>
              <S.ThankYou>Thank You</S.ThankYou>
              <S.Text>
                Your <strong>${routedState?.amount}</strong> contribution to {routedState?.page.revenue_program.name}{' '}
                has been received.
              </S.Text>
              <S.Text>
                A receipt will be sent to <strong>{routedState?.email}</strong> shortly.
              </S.Text>
              {routedState?.page.organization_is_nonprofit && (
                <S.Text>Contributions or gifts to {routedState?.page.revenue_program.name} are tax deductible.</S.Text>
              )}
            </S.TextSection>
            <S.SocialShareSection>
              <S.Text>Share your support on social media</S.Text>
              <S.SocialShareList>
                <S.SocialShareItem>
                  <S.FacebookShare href={buildFacebookHref()} target="_blank" rel="noreferrer">
                    <S.SocialImg src={fbLogo} /> Share
                  </S.FacebookShare>
                </S.SocialShareItem>
                <S.SocialShareItem>
                  <S.TwitterShare href={buildTwitterHref()} target="_blank" rel="noreferrer">
                    <S.SocialImg src={twLogo} /> Tweet
                  </S.TwitterShare>
                </S.SocialShareItem>
                <S.SocialShareItem>
                  <S.EmailShare href={buildEmailHref()} target="_blank" rel="noreferrer">
                    <S.SocialIcon icon={faEnvelope} /> Email
                  </S.EmailShare>
                </S.SocialShareItem>
              </S.SocialShareList>
            </S.SocialShareSection>
            {routedState?.page?.post_thank_you_redirect && (
              <S.Redirect onClick={handleRedirect}>Return to website</S.Redirect>
            )}
          </S.InnerContent>
        </S.Wrapper>
        <DonationPageFooter page={routedState?.page} />
      </S.GenericThankYou>
    </SegregatedStyles>
  );
}

export default GenericThankYou;
