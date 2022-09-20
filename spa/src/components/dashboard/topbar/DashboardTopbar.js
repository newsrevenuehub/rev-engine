import PropTypes from 'prop-types';
import * as S from './DashboardTopbar.styled';
import { ICONS } from 'assets/icons/SvgIcon';
import { useAlert } from 'react-alert';

import useRequest from 'hooks/useRequest';
import logo from 'assets/images/logo-nre.png';
import mobileLogo from 'assets/images/logo-mobile.png';
import logout from 'components/authentication/logout';
import GrabLink from 'components/common/Button/GrabLink';
import PublishButton from 'components/common/Button/PublishButton';

function DashboardTopbar({ isEditPage, page, setPage }) {
  const alert = useAlert();
  const requestPatchPage = useRequest();

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
        {isEditPage ? (
          <>
            <GrabLink page={page} />
            <PublishButton page={page} setPage={setPage} alert={alert} requestPatchPage={requestPatchPage} />
          </>
        ) : (
          <S.LogoutLink
            data-testid="topbar-sign-out"
            onClick={logout}
            whileHover={{ scale: 1.05, x: -3 }}
            whileTap={{ scale: 1, x: 0 }}
          >
            <S.LogoutIcon icon={ICONS.LOGOUT} />
            Sign out
          </S.LogoutLink>
        )}
      </S.TopMenu>
    </S.DashboardTopbar>
  );
}

DashboardTopbar.propTypes = {
  isEditPage: PropTypes.bool,
  setPage: PropTypes.func,
  page: PropTypes.shape({
    revenue_program: PropTypes.shape({
      slug: PropTypes.string
    }).isRequired,
    slug: PropTypes.string.isRequired
  })
};

DashboardTopbar.defaultProps = {
  isEditPage: false,
  page: undefined
};

export default DashboardTopbar;
