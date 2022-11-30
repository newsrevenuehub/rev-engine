import { ICONS } from 'assets/icons/SvgIcon';
import PropTypes, { InferProps } from 'prop-types';
import { useAlert } from 'react-alert';
import * as S from './DashboardTopbar.styled';
import { BackIconButton, SvgLogo, Title } from './DashboardTopbar.styled';

import mobileLogo from 'assets/images/logo-mobile.png';
import logo from 'assets/images/logo-nre.png';
import logoBlue from 'assets/images/nre-logo-blue.svg';
import { Tooltip } from 'components/base';
import AvatarMenu from 'components/common/AvatarMenu';
import GrabLink from 'components/common/Button/GrabLink';
import PublishButton from 'components/common/Button/PublishButton';
import UnsavedChangesModal from 'components/pageEditor/UnsavedChangesModal';
import { PagePropTypes, PartialPagePropTypes, UserPropTypes } from 'constants/propTypes';
import BackButton from 'elements/BackButton';
import { BackIcon } from 'elements/BackButton.styled';
import { ContributionPage } from 'hooks/useContributionPage';
import useModal from 'hooks/useModal';
import useRequest from 'hooks/useRequest';
import { CONTENT_SLUG } from 'routes';

export interface DashboardTopbarProps extends Omit<InferProps<typeof DashboardTopbarPropTypes>, 'updatedPage'> {
  page?: ContributionPage;
  updatedPage?: Partial<ContributionPage>;
}

function DashboardTopbar({ isEditPage, page, setPage, updatedPage, user }: DashboardTopbarProps) {
  const alert = useAlert();
  const requestPatchPage = useRequest();
  const { open: showUnsavedModal, handleClose: closeUnsavedModal, handleOpen: openUnsavedModal } = useModal();
  const updatedPageIsEmpty = !updatedPage || Object.keys(updatedPage).length === 0;

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
            {!updatedPageIsEmpty ? (
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
          <AvatarMenu user={user} />
        )}
      </S.TopMenu>
    </S.DashboardTopbar>
  );
}

const DashboardTopbarPropTypes = {
  isEditPage: PropTypes.bool,
  setPage: PropTypes.func,
  page: PropTypes.shape(PagePropTypes),
  user: PropTypes.shape(UserPropTypes),
  updatedPage: PropTypes.shape(PartialPagePropTypes)
};

DashboardTopbar.propTypes = DashboardTopbarPropTypes;

DashboardTopbar.defaultProps = {
  isEditPage: false,
  page: undefined
};

export default DashboardTopbar;
