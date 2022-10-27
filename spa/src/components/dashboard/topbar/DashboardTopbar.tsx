import PropTypes, { InferProps } from 'prop-types';
import * as S from './DashboardTopbar.styled';
import { ICONS } from 'assets/icons/SvgIcon';
import { useAlert } from 'react-alert';

import useRequest from 'hooks/useRequest';
import logo from 'assets/images/logo-nre.png';
import mobileLogo from 'assets/images/logo-mobile.png';
import logout from 'components/authentication/logout';
import GrabLink from 'components/common/Button/GrabLink';
import PublishButton from 'components/common/Button/PublishButton';
import AvatarMenu from 'components/common/AvatarMenu';
import { PagePropTypes, UserPropTypes } from 'constants/proptypes';

type DashboardTopbarTypes = InferProps<typeof DashboardTopbarPropTypes>

function DashboardTopbar({ isEditPage, page, setPage, user }: DashboardTopbarTypes) {
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
        ) : (<AvatarMenu user={user} />)}
      </S.TopMenu>
    </S.DashboardTopbar>
  );
}

const DashboardTopbarPropTypes = {
  isEditPage: PropTypes.bool,
  setPage: PropTypes.func,
  page: PropTypes.shape(PagePropTypes),
  user: PropTypes.shape(UserPropTypes),
};

DashboardTopbar.propTypes = DashboardTopbarPropTypes

DashboardTopbar.defaultProps = {
  isEditPage: false,
  page: undefined
};

export default DashboardTopbar;
