import BlockIcon from '@material-design-icons/svg/filled/block.svg?react';
import { Button } from 'components/base';
import useModal from 'hooks/useModal';
import { PortalContributionDetail } from 'hooks/usePortalContribution';
import PropTypes, { InferProps } from 'prop-types';
import { useCallback } from 'react';
import { Root } from './Actions.styled';
import CancelContributionModal from './Modals/CancelContributionModal';

const ActionsPropTypes = {
  contribution: PropTypes.object.isRequired,
  cancelContribution: PropTypes.func.isRequired
};

export interface ActionsProps extends InferProps<typeof ActionsPropTypes> {
  contribution: PortalContributionDetail;
  cancelContribution: (id: number) => void;
}

export function Actions({ contribution, cancelContribution }: ActionsProps) {
  const { open, handleOpen, handleClose } = useModal();

  const onCancelContribution = useCallback(
    async (id: number) => {
      try {
        await cancelContribution(id);
      } catch (error) {
        console.error(error);
      } finally {
        handleClose();
      }
    },
    [cancelContribution, handleClose]
  );

  if (contribution.is_cancelable) {
    return (
      <>
        <Root>
          <Button color="text" startIcon={<BlockIcon />} onClick={handleOpen}>
            Cancel Contribution
          </Button>
        </Root>
        {open && (
          <CancelContributionModal
            open={open}
            onClose={handleClose}
            onSubmit={() => onCancelContribution(contribution.id)}
          />
        )}
      </>
    );
  }

  return null;
}

Actions.propTypes = ActionsPropTypes;
export default Actions;
