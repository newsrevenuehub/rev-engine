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
import { BackIconButton, Group, Root, SvgLogo } from './PageEditorTopbar.styled';
import PageName from './PageName';

function PageEditorTopbar() {
  const { pageChanges } = useEditablePageContext();
  const { open: showUnsavedModal, handleClose: closeUnsavedModal, handleOpen: openUnsavedModal } = useModal();
  const updatedPageIsEmpty = Object.keys(pageChanges).length === 0;
  const backButton = updatedPageIsEmpty ? (
    <div>
      <BackButton to={CONTENT_SLUG} style={{ fill: 'white' }} data-testid="back" aria-label="Exit" />
    </div>
  ) : (
    <BackIconButton onClick={openUnsavedModal} data-testid="modal-back" aria-label="Exit">
      <BackIcon icon={ICONS.ARROW_LEFT} />
    </BackIconButton>
  );

  return (
    <Root>
      <Group>
        <Tooltip title="Exit">{backButton}</Tooltip>
        <SvgLogo src={logoBlue} alt="News Revenue Hub Logo" />
        <PageName />
      </Group>
      <Group>
        <GrabLink />
        <PublishButton />
        {showUnsavedModal && (
          <UnsavedChangesModal to={CONTENT_SLUG} isOpen={showUnsavedModal} closeModal={closeUnsavedModal} />
        )}
      </Group>
    </Root>
  );
}

export default PageEditorTopbar;
