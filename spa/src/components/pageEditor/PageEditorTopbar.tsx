import { ICONS } from 'assets/icons/SvgIcon';
import logoBlue from 'assets/images/nre-logo-blue.svg';
import { Tooltip } from 'components/base';
import GrabLink from 'components/common/Button/GrabLink';
import PublishButton from 'components/common/Button/PublishButton';
import UnsavedChangesModal from 'components/pageEditor/UnsavedChangesModal';
import BackButton from 'elements/BackButton';
import { BackIcon } from 'elements/BackButton.styled';
import { useEditablePageContext } from 'hooks/useEditablePage';
import useModal from 'hooks/useModal';
import { CONTENT_SLUG } from 'routes';
import { BackIconButton, Root, SvgLogo, Title, TopMenu } from './PageEditorTopbar.styled';

function PageEditorTopbar() {
  const { page, pageChanges } = useEditablePageContext();
  const { open: showUnsavedModal, handleClose: closeUnsavedModal, handleOpen: openUnsavedModal } = useModal();
  const updatedPageIsEmpty = Object.keys(pageChanges).length === 0;
  const backButton = updatedPageIsEmpty ? (
    <Tooltip title="Exit">
      <div>
        <BackButton to={CONTENT_SLUG} style={{ fill: 'white' }} data-testid="back" aria-label="Exit" />
      </div>
    </Tooltip>
  ) : (
    <Tooltip title="Exit">
      <BackIconButton onClick={openUnsavedModal} data-testid="modal-back" aria-label="Exit">
        <BackIcon icon={ICONS.ARROW_LEFT} />
      </BackIconButton>
    </Tooltip>
  );

  return (
    <Root>
      <TopMenu>
        {backButton}
        <SvgLogo src={logoBlue} alt="News Revenue Hub Logo" />
        <Title>{page?.name}</Title>
        <GrabLink />
        <PublishButton />
        {showUnsavedModal && (
          <UnsavedChangesModal to={CONTENT_SLUG} isOpen={showUnsavedModal} closeModal={closeUnsavedModal} />
        )}
      </TopMenu>
    </Root>
  );
}

export default PageEditorTopbar;
