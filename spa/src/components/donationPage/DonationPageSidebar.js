import * as S from './DonationPageSidebar.styled';
import { getDynamicElement } from './pageGetters';

function DonationPageSidebar({ sidebarContent, live }) {
  if (!sidebarContent || sidebarContent.length === 0) return null;

  return (
    <S.DonationPageSidebar>
      <S.SidebarContent>
        {sidebarContent?.map((sidebarElement) => getDynamicElement(sidebarElement, live))}
      </S.SidebarContent>
    </S.DonationPageSidebar>
  );
}

export default DonationPageSidebar;
