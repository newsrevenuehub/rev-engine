import * as S from './GenericThankYou.styled';
import SegregatedStyles from 'components/donationPage/SegregatedStyles';

// Assets
import fbLogo from 'assets/images/fb_logo.png';
import twLogo from 'assets/images/twitter_logo.png';
import { faEnvelope } from '@fortawesome/free-solid-svg-icons';

// Router
import { useLocation } from 'react-router-dom';
import { useEffect } from 'react';

// Children
import DonationPageNavbar from 'components/donationPage/DonationPageNavbar';
import DonationPageFooter from 'components/donationPage/DonationPageFooter';

function GenericThankYou({ setOrgAnalytics }) {
  const { state: routedState } = useLocation();

  const orgGaV3Domain = routedState?.page?.revenue_program?.google_analytics_v3_domain;
  const orgGaV3Id = routedState?.page?.revenue_program?.google_analytics_v3_id;
  const orgGaV4Id = routedState?.page?.revenue_program?.google_analytics_v4_id;

  useEffect(() => {
    setOrgAnalytics(orgGaV3Id, orgGaV3Domain, orgGaV4Id);
  }, [orgGaV3Domain, orgGaV3Id, orgGaV4Id]);

  const handleRedirect = () => {
    window.open(routedState?.page?.post_thank_you_redirect, '_self');
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
                Your donation of <strong>${routedState?.amount}</strong> to {routedState?.page.revenue_program.name} has
                been received.
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
                  <S.FacebookShare>
                    <S.SocialImg src={fbLogo} /> Share
                  </S.FacebookShare>
                </S.SocialShareItem>
                <S.SocialShareItem>
                  <S.TwitterShare>
                    <S.SocialImg src={twLogo} /> Tweet
                  </S.TwitterShare>
                </S.SocialShareItem>
                <S.SocialShareItem>
                  <S.EmailShare>
                    <S.SocialIcon icon={faEnvelope} /> Email
                  </S.EmailShare>
                </S.SocialShareItem>
              </S.SocialShareList>
            </S.SocialShareSection>
            {routedState?.page?.post_thank_you_redirect && (
              <S.Redirect onClick={handleRedirect}>Take me back to the news</S.Redirect>
            )}
          </S.InnerContent>
        </S.Wrapper>
        <DonationPageFooter page={routedState?.page} />
      </S.GenericThankYou>
    </SegregatedStyles>
  );
}

export default GenericThankYou;
