import { Undo } from '@material-ui/icons';
import PropTypes, { InferProps } from 'prop-types';
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
  return (
    <Root>
      {variant === 'cancel' && (
        <Button color="secondary" disabled={!!cancelDisabled} onClick={onCancel}>
          Cancel
        </Button>
      )}
      {variant === 'undo' && (
        <Button color="text" disabled={!!cancelDisabled} onClick={onCancel} startIcon={<Undo />}>
          Undo
        </Button>
      )}
      <Button color="primaryDark" onClick={onUpdate}>
        Update
      </Button>
    </Root>
  );
}

EditSaveControls.propTypes = EditSaveControlsPropTypes;
export default EditSaveControls;
