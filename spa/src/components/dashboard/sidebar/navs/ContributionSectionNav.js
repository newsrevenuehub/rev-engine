import React from 'react';
import * as S from './../DashboardSidebar.styled';
import { DONATIONS_SLUG } from 'routes';
import { ICONS } from 'assets/icons/SvgIcon';

function ContributionSectionNav({ hasContributionsSectionAccess, shouldAllowDashboard }) {
  if (hasContributionsSectionAccess) {
    return (
      <S.NavSection aria-labelledby="activity-section-id">
        <S.Divider />
        <S.SectionLabel id="activity-section-id">Activity</S.SectionLabel>
        <S.NavItem
          aria-labelledby="contributions-nav-item-id"
          role="listitem"
          data-testid="nav-contributions-item"
          to={DONATIONS_SLUG}
          disabled={!shouldAllowDashboard}
        >
          <S.NavItemIcon icon={ICONS.CONTRIBUTIONS} />
          <S.SideBarText id="contributions-nav-item-id">Contributions</S.SideBarText>
        </S.NavItem>
      </S.NavSection>
    );
  }

  return null;
}

export default ContributionSectionNav;
