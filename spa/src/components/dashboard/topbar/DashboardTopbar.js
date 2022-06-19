import * as S from './DashboardTopbar.styled';
import { ICONS } from 'assets/icons/SvgIcon';

import logo from 'assets/images/logo-nre.png';
import mobileLogo from 'assets/images/logo-mobile.png';

import logout from 'components/authentication/logout';
function DashboardTopbar({ shouldAllowDashboard }) {
  const handleClick = (e) => {
    if (!shouldAllowDashboard) e.preventDefault();
  };

  return (
    <S.DashboardTopbar>
      <S.TopLogo>
        <S.Logo src={logo} />
      </S.TopLogo>
      <S.TopLogoMobile>
        <S.Logo src={mobileLogo} />
      </S.TopLogoMobile>
      <S.TopMenu onClick={logout} whileHover={{ scale: 1.05, x: -3 }} whileTap={{ scale: 1, x: 0 }}>
        <S.LogoutIcon icon={ICONS.LOGOUT} />
        Logout
      </S.TopMenu>
    </S.DashboardTopbar>
  );
}

export default DashboardTopbar;
