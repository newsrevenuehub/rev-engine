import { Add, Close } from '@material-ui/icons';
import PropTypes, { InferProps } from 'prop-types';
import { useState } from 'react';
import TextField from '../TextField/TextField';
import { AddButton, Item, RemoveButton, Root } from './EditableList.styles';

const EditableListPropTypes = {
  id: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  prompt: PropTypes.string.isRequired,
  validateNewValue: PropTypes.func,
  value: PropTypes.arrayOf(PropTypes.string.isRequired).isRequired
};

export interface EditableListProps extends InferProps<typeof EditableListPropTypes> {
  onChange: (value: string[]) => void;
  validateNewValue?: (value: string) => string | undefined;
}

export function EditableList({ id, onChange, prompt, validateNewValue, value }: EditableListProps) {
  const [newValue, setNewValue] = useState('');
  const newValidationMessage = validateNewValue ? validateNewValue(newValue) : null;

  function handleAdd() {
    if (newValue === '') {
      return;
    }

    onChange([...value, newValue]);
    setNewValue('');
  }

  function handleRemove(item: string) {
    onChange(value.filter((existing) => existing !== item));
  }

  return (
    <Root>
      {value.map((item) => (
        <Item key={item}>
          {item}
          <RemoveButton aria-label={`Remove ${item}`} onClick={() => handleRemove(item)}>
            <Close />
          </RemoveButton>
        </Item>
      ))}
      <TextField
        InputProps={{
          // Have to copy props from our base component to get styling to look correct.
          classes: { root: 'NreTextFieldInputRoot', underline: 'NreTextFieldInputUnderline' },
          endAdornment: (
            <AddButton
              aria-label="Add"
              disabled={!!newValidationMessage || newValue === ''}
              onClick={handleAdd}
              type="submit"
            >
              <Add />
            </AddButton>
          )
        }}
        error={!!newValidationMessage}
        helperText={newValidationMessage}
        id={id}
        label={prompt}
        onChange={(event) => setNewValue(event.target.value)}
        placeholder={prompt}
        value={newValue}
      />
    </Root>
  );
}

EditableList.propTypes = EditableListPropTypes;
export default EditableList;
