import { useQuery } from '@tanstack/react-query';
import axios from 'ajax/axios';
import { LIVE_PAGE_DETAIL } from 'ajax/endpoints';
import { DASHBOARD_SUBDOMAINS } from 'appSettings';
import DonationPageHeader from 'components/donationPage/DonationPageHeader';
import SegregatedStyles from 'components/donationPage/SegregatedStyles';
import { PLAN_NAMES } from 'constants/orgPlanConstants';
import { ContributionPage } from 'hooks/useContributionPage';
import useSubdomain from 'hooks/useSubdomain';
import useWebFonts from 'hooks/useWebFonts';
import { ReactComponent as NRELogo } from 'assets/images/nre-logo-yellow.svg';
import React from 'react';
import { PoweredBy } from './PortalPage.styled';

async function fetchPage(rpSlug: string): Promise<ContributionPage> {
  try {
    const { data } = await axios.get(LIVE_PAGE_DETAIL, { params: { revenue_program: rpSlug } });

    return data;
  } catch (error) {
    // Log it for Sentry and rethrow, which should cause the generic error
    // message to appear.
    console.error(error);
    throw error;
  }
}

function PortalPage({ component: Component }: { component: React.ComponentType<any> }) {
  const subdomain = useSubdomain();
  const { data: page, isFetched } = useQuery(['getPage'], () => fetchPage(subdomain), {
    enabled: !DASHBOARD_SUBDOMAINS.includes(subdomain)
  });

  const isFreeOrg = page?.revenue_program?.organization?.plan?.name === PLAN_NAMES.FREE;
  const hasDefaultDonationPage = !!page?.revenue_program?.default_donation_page;
  // If Donation page belongs to a paid org (not Free) and RP has a Default Donation Page, use custom styles
  const renderCustomStyles = !isFreeOrg && hasDefaultDonationPage;

  useWebFonts(page?.styles?.font);

  // If rp has no default page, normal contributor page is shown
  if (!DASHBOARD_SUBDOMAINS.includes(subdomain) && !page && !isFetched) return null;

  return (
    <SegregatedStyles page={renderCustomStyles && page}>
      <DonationPageHeader page={page} />
      <Component page={page} />
      <PoweredBy>
        <span>Powered by</span>
        <NRELogo style={{ width: 145 }} />
      </PoweredBy>
    </SegregatedStyles>
  );
}

export default PortalPage;
