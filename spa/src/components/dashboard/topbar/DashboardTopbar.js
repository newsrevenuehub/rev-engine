import PropTypes from 'prop-types';
import * as S from './DashboardTopbar.styled';
import { SvgLogo, Title, BackIconButton } from './DashboardTopbar.styled';
import { ICONS } from 'assets/icons/SvgIcon';
import { useAlert } from 'react-alert';

import { PagePropTypes } from 'constants/proptypes';
import { BackIcon } from 'elements/BackButton.styled';
import { CONTENT_SLUG } from 'routes';
import BackButton from 'elements/BackButton';
import useRequest from 'hooks/useRequest';
import logo from 'assets/images/logo-nre.png';
import logoBlue from 'assets/images/nre-logo-blue.svg';
import mobileLogo from 'assets/images/logo-mobile.png';
import logout from 'components/authentication/logout';
import GrabLink from 'components/common/Button/GrabLink';
import PublishButton from 'components/common/Button/PublishButton';
import UnsavedChangesModal from 'components/pageEditor/UnsavedChangesModal';
import useModal from 'hooks/useModal';
import { Tooltip } from 'components/base';

function DashboardTopbar({ isEditPage, page, setPage, updatedPage }) {
  const alert = useAlert();
  const requestPatchPage = useRequest();
  const { open: showUnsavedModal, handleClose: closeUnsavedModal, handleOpen: openUnsavedModal } = useModal();

  return (
    <S.DashboardTopbar>
      {!isEditPage ? (
        <>
          <S.TopLogo>
            <S.Logo src={logo} alt="News Revenue Hub Logo" />
          </S.TopLogo>
          <S.TopLogoMobile>
            <S.Logo src={mobileLogo} alt="News Revenue Hub Logo" />
          </S.TopLogoMobile>
        </>
      ) : null}
      <S.TopMenu>
        {isEditPage ? (
          <>
            {updatedPage ? (
              <Tooltip title="Exit">
                <BackIconButton onClick={openUnsavedModal} data-testid="modal-back" aria-label="Exit">
                  <BackIcon icon={ICONS.ARROW_LEFT} />
                </BackIconButton>
              </Tooltip>
            ) : (
              <Tooltip title="Exit">
                <div>
                  <BackButton to={CONTENT_SLUG} style={{ fill: 'white' }} data-testid="back" aria-label="Exit" />
                </div>
              </Tooltip>
            )}
            <SvgLogo src={logoBlue} alt="News Revenue Hub Logo" />
            <Title>{page?.name}</Title>
            <GrabLink page={page} />
            <PublishButton page={page} setPage={setPage} alert={alert} requestPatchPage={requestPatchPage} />
            {showUnsavedModal && (
              <UnsavedChangesModal to={CONTENT_SLUG} isOpen={showUnsavedModal} closeModal={closeUnsavedModal} />
            )}
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
  page: PropTypes.shape(PagePropTypes),
  updatedPage: PropTypes.shape(PagePropTypes)
};

DashboardTopbar.defaultProps = {
  isEditPage: false,
  page: undefined
};

export default DashboardTopbar;
