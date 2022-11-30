import { Add } from '@material-ui/icons';
import { Button } from 'components/base';
import PropTypes, { InferProps } from 'prop-types';
import { Prompt, Root } from './EditTabHeader.styles';

const EditTabHeaderPropTypes = {
  addButtonLabel: PropTypes.string,
  onAdd: PropTypes.func,
  prompt: PropTypes.string.isRequired
};

export interface EditTabHeaderProps extends InferProps<typeof EditTabHeaderPropTypes> {
  onAdd?: () => void;
}

/**
 * Displays a prompt to the user and optionally a button to add new content.
 */
export function EditTabHeader({ addButtonLabel, onAdd, prompt }: EditTabHeaderProps) {
  return (
    <Root>
      <Prompt>{prompt}</Prompt>
      {addButtonLabel && onAdd && (
        <Button color="information" startIcon={<Add />} onClick={onAdd}>
          {addButtonLabel}
        </Button>
      )}
    </Root>
  );
}

EditTabHeader.propTypes = EditTabHeaderPropTypes;
export default EditTabHeader;
