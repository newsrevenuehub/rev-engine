import { MoreHorizOutlined } from '@material-ui/icons';
import { Menu, MenuItem, Modal, ModalContent, ModalFooter, ModalHeader } from 'components/base';
import PropTypes, { InferProps } from 'prop-types';
import { useState } from 'react';
import { useContribution } from 'hooks/useContribution';
import useModal from 'hooks/useModal';
import { Button, ModalHeaderIcon, RedEmphasis, Root } from './ContributionDetailActions.styled';

const ContributionDetailActionsPropTypes = {
  contributionId: PropTypes.number.isRequired
};

export type ContributionDetailActionsProps = InferProps<typeof ContributionDetailActionsPropTypes>;

export function ContributionDetailActions({ contributionId }: ContributionDetailActionsProps) {
  const { cancelContribution, contribution } = useContribution(contributionId);
  const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLButtonElement | null>(null);
  const { handleClose: handleConfirmClose, handleOpen: handleConfirmOpen, open: confirmOpen } = useModal();

  function handleMenuClose() {
    setMenuAnchorEl(null);
  }

  function handleConfirmCancel() {
    cancelContribution();
    handleConfirmClose();
  }

  return (
    <Root>
      <Button
        aria-controls="contribution-detail-actions-menu"
        aria-label="Actions"
        color="secondary"
        onClick={(event) => setMenuAnchorEl(event.currentTarget)}
      >
        <MoreHorizOutlined />
      </Button>
      <Menu
        id="contribution-detail-actions-menu"
        anchorEl={menuAnchorEl}
        keepMounted
        onClose={handleMenuClose}
        open={!!menuAnchorEl}
      >
        <MenuItem disabled={!contribution || !contribution.is_cancelable} onClick={handleConfirmOpen}>
          Cancel Contribution
        </MenuItem>
      </Menu>
      <Modal width={660} open={confirmOpen}>
        <ModalHeader icon={<ModalHeaderIcon />} onClose={handleConfirmClose}>
          <RedEmphasis>Cancel Contribution</RedEmphasis>
        </ModalHeader>
        <ModalContent>
          You're canceling a recurring contributions. The contributor will receive an email notification of the
          cancelation. Are you sure you want to cancel this contribution?
        </ModalContent>
        <ModalFooter>
          <Button color="secondary" onClick={handleConfirmClose}>
            No, Don't Cancel
          </Button>
          <Button color="error" onClick={handleConfirmCancel}>
            Yes, Cancel
          </Button>
        </ModalFooter>
      </Modal>
    </Root>
  );
}

ContributionDetailActions.propTypes = ContributionDetailActionsPropTypes;
export default ContributionDetailActions;
