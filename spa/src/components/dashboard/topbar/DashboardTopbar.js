import * as S from './DashboardTopbar.styled';
import { ICONS } from 'assets/icons/SvgIcon';

import logo from 'assets/images/logo-nre.png';
import mobileLogo from 'assets/images/logo-mobile.png';

import logout from 'components/authentication/logout';
function DashboardTopbar({ isEditPage }) {
  return (
    <S.DashboardTopbar>
      {!isEditPage ? (
        <>
          <S.TopLogo>
            <S.Logo src={logo} />
          </S.TopLogo>
          <S.TopLogoMobile>
            <S.Logo src={mobileLogo} />
          </S.TopLogoMobile>
        </>
      ) : null}
      <S.TopMenu>
        <S.LogoutLink
          data-testid="topbar-sign-out"
          onClick={logout}
          whileHover={{ scale: 1.05, x: -3 }}
          whileTap={{ scale: 1, x: 0 }}
        >
          <S.LogoutIcon icon={ICONS.LOGOUT} />
          Sign out
        </S.LogoutLink>
      </S.TopMenu>
    </S.DashboardTopbar>
  );
}

export default DashboardTopbar;
