import BlockIcon from '@material-design-icons/svg/filled/block.svg?react';
import { Button } from 'components/base';
import useModal from 'hooks/useModal';
import { PortalContributionDetail } from 'hooks/usePortalContribution';
import PropTypes, { InferProps } from 'prop-types';
import { useCallback } from 'react';
import { Root } from './Actions.styled';
import CancelContributionModal from '../modals/CancelContributionModal';

const ActionsPropTypes = {
  contribution: PropTypes.object.isRequired,
  onCancelContribution: PropTypes.func.isRequired
};

export interface ActionsProps extends InferProps<typeof ActionsPropTypes> {
  contribution: PortalContributionDetail;
  onCancelContribution: () => void;
}

export function Actions({ contribution, onCancelContribution }: ActionsProps) {
  const { open, handleOpen, handleClose } = useModal();

  const onCancel = useCallback(() => {
    onCancelContribution();
    handleClose();
  }, [onCancelContribution, handleClose]);

  if (contribution.is_cancelable) {
    return (
      <>
        <Root>
          <Button color="text" startIcon={<BlockIcon />} onClick={handleOpen}>
            Cancel Contribution
          </Button>
        </Root>
        {open && <CancelContributionModal open={open} onClose={handleClose} onSubmit={onCancel} />}
      </>
    );
  }

  return null;
}

Actions.propTypes = ActionsPropTypes;
export default Actions;
