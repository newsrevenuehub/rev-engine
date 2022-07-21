import React from 'react';
import * as S from './../DashboardSidebar.styled';
import { CONTENT_SLUG, CUSTOMIZE_SLUG } from 'routes';
import { ICONS } from 'assets/icons/SvgIcon';

function ContentSectionNav() {
  return (
    <S.NavSection aria-labelledby="content-section-id">
      <S.SectionLabel id="content-section-id">Content</S.SectionLabel>
      <S.NavItem aria-labelledby="pages-nav-item-id" role="listitem" data-testid="nav-pages-item" to={CONTENT_SLUG}>
        <S.NavItemIcon icon={ICONS.PAGES} />
        <S.SideBarText id="pages-nav-item-id">Pages</S.SideBarText>
      </S.NavItem>
      <S.NavItem
        aria-labelledby="customize-nav-item-id"
        role="listitem"
        data-testid="nav-styles-item"
        to={CUSTOMIZE_SLUG}
      >
        <S.NavItemIcon icon={ICONS.CUSTOMIZE} />
        <S.SideBarText id="customize-nav-item-id">Customize</S.SideBarText>
      </S.NavItem>
    </S.NavSection>
  );
}

export default ContentSectionNav;
