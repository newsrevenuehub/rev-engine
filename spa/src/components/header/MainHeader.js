import * as S from './MainHeader.styled';

// Routing
import { useLocation } from 'react-router-dom';
import { ORG_SLUG } from 'routes';

// Children
import BackButton from 'elements/BackButton';

import OrganizationDropdown from 'components/header/OrganizationDropdown';

function MainHeader() {
  const { pathname } = useLocation();
  return (
    <S.MainHeader>
      <S.InnerContent>
        {pathname === ORG_SLUG ? <BackButton /> : <div />}
        <OrganizationDropdown />
      </S.InnerContent>
    </S.MainHeader>
  );
}

export default MainHeader;
