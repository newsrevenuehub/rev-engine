import { Undo } from '@material-ui/icons';
import PropTypes, { InferProps } from 'prop-types';
import { ReactNode } from 'react';
import { Button, Root } from './EditSaveControls.styles';

const EditSaveControlsPropTypes = {
  cancelDisabled: PropTypes.bool,
  onCancel: PropTypes.func.isRequired,
  onUpdate: PropTypes.func.isRequired,
  variant: PropTypes.oneOf(['cancel', 'undo']).isRequired
};

export interface EditSaveControlsProps extends InferProps<typeof EditSaveControlsPropTypes> {
  onCancel: () => void;
  onUpdate: () => void;
  variant: 'cancel' | 'undo';
}

export function EditSaveControls({ cancelDisabled, onCancel, onUpdate, variant }: EditSaveControlsProps) {
  const commonSecondaryProps = { disabled: !!cancelDisabled, onClick: onCancel };
  const secondaryButtons: Record<EditSaveControlsProps['variant'], ReactNode> = {
    cancel: (
      <Button color="secondary" {...commonSecondaryProps}>
        Cancel
      </Button>
    ),
    undo: (
      <Button color="text" startIcon={<Undo />} {...commonSecondaryProps}>
        Undo
      </Button>
    )
  };

  return (
    <Root>
      {secondaryButtons[variant]}
      <Button color="primaryDark" onClick={onUpdate}>
        Update
      </Button>
    </Root>
  );
}

EditSaveControls.propTypes = EditSaveControlsPropTypes;
export default EditSaveControls;
