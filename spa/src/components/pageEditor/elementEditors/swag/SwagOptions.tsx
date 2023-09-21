import { Add, Close } from '@material-ui/icons';
import { FormEvent, useMemo, useState } from 'react';
import { TextField } from 'components/base';
import { cleanSwagValue, validateSwagValue } from 'utilities/swagValue';
import PropTypes, { InferProps } from 'prop-types';
import {
  Controls,
  Legend,
  NewOptionButton,
  NewOptionContainer,
  NewOptionTextField,
  Option,
  RemoveOptionButton,
  Root
} from './SwagOptions.styled';

const SwagOptionsPropTypes = {
  onAddSwagOption: PropTypes.func.isRequired,
  onChangeSwagName: PropTypes.func.isRequired,
  onRemoveSwagOption: PropTypes.func.isRequired,
  swagName: PropTypes.string.isRequired,
  swagNameError: PropTypes.string,
  swagOptions: PropTypes.arrayOf(PropTypes.string.isRequired).isRequired
};

export interface SwagOptionsProps extends InferProps<typeof SwagOptionsPropTypes> {
  onAddSwagOption: (value: string) => void;
  onChangeSwagName: (value: string) => void;
  onRemoveSwagOption: (value: string) => void;
}

export function SwagOptions({
  onAddSwagOption,
  onChangeSwagName,
  onRemoveSwagOption,
  swagName,
  swagNameError,
  swagOptions
}: SwagOptionsProps) {
  const [newOption, setNewOption] = useState('');
  const newOptionInvalidMessage = useMemo(() => {
    // An empty string won't show a validation error.

    if (newOption === '') {
      return;
    }

    const validationMessage = validateSwagValue(newOption);

    if (validationMessage) {
      return validationMessage;
    }

    if (
      swagOptions.some((existing) => cleanSwagValue(existing).toLowerCase() === cleanSwagValue(newOption).toLowerCase())
    ) {
      return 'This option has already been added.';
    }
  }, [newOption, swagOptions]);

  function handleNewOptionSubmit(event: FormEvent) {
    event.preventDefault();

    if (newOptionInvalidMessage || newOption === '') {
      return;
    }

    onAddSwagOption(newOption);
    setNewOption('');
  }

  return (
    <Root>
      <Legend>Dropdown Menu</Legend>
      <Controls>
        <TextField
          error={!!swagNameError}
          id="swag-options-swag-name"
          helperText={swagNameError}
          // Have to copy props from our base component to get styling to look correct.
          inputProps={{ className: 'NreTextFieldInput', maxLength: 100 }}
          label="Swag Selection Label"
          onChange={(event) => onChangeSwagName(event.target.value)}
          placeholder="e.g. T-shirt size, Choose swag, Swag selection, etc."
          value={swagName}
        />
        {swagOptions.map((option) => (
          <Option key={option}>
            {option}
            <RemoveOptionButton aria-label={`Remove ${option}`} onClick={() => onRemoveSwagOption(option)}>
              <Close />
            </RemoveOptionButton>
          </Option>
        ))}
        <NewOptionContainer onSubmit={handleNewOptionSubmit}>
          <NewOptionTextField
            error={!!newOptionInvalidMessage}
            helperText={newOptionInvalidMessage}
            id="swag-options-new-option"
            // Have to copy props from our base component to get styling to look correct.
            inputProps={{ className: 'NreTextFieldInput', maxLength: 100 }}
            InputProps={{
              classes: { root: 'NreTextFieldInputRoot', underline: 'NreTextFieldInputUnderline' },
              endAdornment: (
                <NewOptionButton aria-label="Add" disabled={!!newOptionInvalidMessage} type="submit">
                  <Add />
                </NewOptionButton>
              )
            }}
            label="Add Swag Option"
            onChange={(event) => setNewOption(event.target.value)}
            placeholder="Swag option"
            value={newOption}
          />
        </NewOptionContainer>
      </Controls>
    </Root>
  );
}

SwagOptions.propTypes = SwagOptionsPropTypes;
export default SwagOptions;
