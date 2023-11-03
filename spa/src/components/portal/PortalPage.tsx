import PoweredByNRELogo from 'assets/images/nre-logo-yellow.svg?react';
import TrackPageView from 'components/analytics/TrackPageView';
import DonationPageHeader from 'components/donationPage/DonationPageHeader';
import SegregatedStyles from 'components/donationPage/SegregatedStyles';
import { PLAN_NAMES } from 'constants/orgPlanConstants';
import usePortal from 'hooks/usePortal';
import useWebFonts from 'hooks/useWebFonts';
import React from 'react';
import NRELogo from 'assets/images/nre-logo-blue.svg';
import { PoweredBy, Header, Logo } from './PortalPage.styled';
import { HOME_PAGE_URL } from 'constants/helperUrls';

function PortalPage({ children }: { children: React.ReactNode }) {
  const { page, pageIsFetched, enablePageFetch } = usePortal();

  const isFreeOrg = page?.revenue_program?.organization?.plan?.name === PLAN_NAMES.FREE;
  const hasDefaultDonationPage = !!page?.revenue_program?.default_donation_page;
  // If Donation page belongs to a paid org (not Free) and RP has a Default Donation Page, use custom styles
  const renderCustomStyles = !isFreeOrg && hasDefaultDonationPage;

  useWebFonts(page?.styles?.font);

  // If rp has no default page, normal contributor page is shown
  if (enablePageFetch && !page && !pageIsFetched) return null;

  return (
    <TrackPageView>
      <SegregatedStyles page={renderCustomStyles && page}>
        {renderCustomStyles ? (
          <DonationPageHeader page={page} />
        ) : (
          <Header>
            <Logo src={NRELogo} alt="News Revenue Engine" />
          </Header>
        )}
        {children}
        <PoweredBy>
          <span>Powered by</span>
          {/* eslint-disable-next-line react/jsx-no-target-blank */}
          <a href={HOME_PAGE_URL} target="_blank" aria-label="News Revenue Engine">
            <PoweredByNRELogo style={{ width: 145 }} />
          </a>
        </PoweredBy>
      </SegregatedStyles>
    </TrackPageView>
  );
}

export default PortalPage;
