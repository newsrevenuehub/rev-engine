import PropTypes, { InferProps } from 'prop-types';
import { ReactNode } from 'react';
import NRELogo from 'assets/images/nre-logo-blue.svg';
import PoweredByNRELogo from 'assets/images/nre-logo-yellow.svg?react';
import TrackPageView from 'components/analytics/TrackPageView';
import DonationPageHeader from 'components/donationPage/DonationPageHeader';
import SegregatedStyles from 'components/donationPage/SegregatedStyles';
import { HOME_PAGE_URL } from 'constants/helperUrls';
import { PLAN_NAMES } from 'constants/orgPlanConstants';
import usePortal from 'hooks/usePortal';
import useWebFonts from 'hooks/useWebFonts';
import { PoweredBy, Header, Logo, Root } from './PortalPage.styled';
import { useConfigureAnalytics } from 'components/analytics';
import LivePage404 from 'components/common/LivePage404/LivePage404';

const PortalPagePropTypes = {
  children: PropTypes.any,
  className: PropTypes.string
};

export interface PortalPageProps extends InferProps<typeof PortalPagePropTypes> {
  children?: ReactNode;
  className?: string;
}

function PortalPage({ children, className }: PortalPageProps) {
  const { page, isPageLoading, isPageError } = usePortal();

  const isFreeOrg = page?.revenue_program?.organization?.plan?.name === PLAN_NAMES.FREE;
  const hasDefaultDonationPage = !!page?.revenue_program?.default_donation_page;
  // If Donation page belongs to a paid org (not Free) and RP has a Default Donation Page, use custom styles
  const renderCustomStyles = !isFreeOrg && hasDefaultDonationPage;

  useWebFonts(page?.styles?.font);
  useConfigureAnalytics();

  // If rp has no default page, show 404
  if (!page && isPageLoading) return null;

  return (
    <TrackPageView>
      <SegregatedStyles page={renderCustomStyles && page}>
        <Root className={className}>
          {renderCustomStyles ? (
            <DonationPageHeader page={page} />
          ) : (
            <Header>
              <Logo src={NRELogo} alt="News Revenue Engine" />
            </Header>
          )}
          {!page && isPageError ? <LivePage404 hideRedirect /> : children}
          <PoweredBy>
            <span>Powered by</span>
            <a href={HOME_PAGE_URL} target="_blank" aria-label="News Revenue Engine">
              <PoweredByNRELogo style={{ width: 145 }} />
            </a>
          </PoweredBy>
        </Root>
      </SegregatedStyles>
    </TrackPageView>
  );
}

PortalPage.propTypes = PortalPagePropTypes;

export default PortalPage;
