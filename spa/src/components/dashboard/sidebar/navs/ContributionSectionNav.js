import React from 'react';
import * as S from './../DashboardSidebar.styled';
import { DONATIONS_SLUG, QUARANTINES_SLUG } from 'routes';
import { ICONS } from 'assets/icons/SvgIcon';

function ContributionSectionNav() {
  return (
    <S.NavSection aria-labelledby="activity-section-id">
      <S.Divider />
      <S.SectionLabel id="activity-section-id">Activity</S.SectionLabel>
      <S.NavItem
        aria-labelledby="contributions-nav-item-id"
        role="listitem"
        data-testid="nav-contributions-item"
        to={DONATIONS_SLUG}
      >
        <S.NavItemIcon icon={ICONS.CONTRIBUTIONS} />
        <S.SideBarText id="contributions-nav-item-id">Contributions</S.SideBarText>
      </S.NavItem>

      <S.NavItem
        aria-labelledby="quarantine-nav-item-id"
        role="listitem"
        data-testid="nav-quarantine-item"
        to={QUARANTINES_SLUG}
      >
        <S.NavItemIcon icon={ICONS.CONTRIBUTIONS} />
        <S.SideBarText id="quarantine-nav-item-id">Quarantines</S.SideBarText>
      </S.NavItem>
    </S.NavSection>
  );
}

export default ContributionSectionNav;
