import PropTypes, { InferProps } from 'prop-types';
import { Button, Root } from './EditSaveControls.styles';

const EditSaveControlsPropTypes = {
  onUndo: PropTypes.func.isRequired,
  onUpdate: PropTypes.func.isRequired
};

export interface EditSaveControlsProps extends InferProps<typeof EditSaveControlsPropTypes> {
  onUndo: () => void;
  onUpdate: () => void;
}

export function EditSaveControls({ onUndo, onUpdate }: EditSaveControlsProps) {
  return (
    <Root>
      <Button color="secondary" onClick={onUndo}>
        Undo
      </Button>
      <Button color="primaryDark" onClick={onUpdate}>
        Update
      </Button>
    </Root>
  );
}

EditSaveControls.propTypes = EditSaveControlsPropTypes;
export default EditSaveControls;
