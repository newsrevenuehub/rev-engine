import { useState } from 'react';
import * as S from './SwagEditor.styled';
import { useTheme } from 'styled-components';

// Assets
import { faTrash } from '@fortawesome/free-solid-svg-icons';

// Context
import { useEditInterfaceContext } from 'components/pageEditor/editInterface/EditInterface';

// Children/Elements
import FormErrors from 'elements/inputs/FormErrors';
import PlusButton from 'elements/buttons/PlusButton';
import XButton from 'elements/buttons/XButton';

const defaultContent = {
  optOutDefault: false,
  swags: []
};

const SWAG_LIMIT = 3;

function SwagEditor() {
  const theme = useTheme();
  const { elementContent = defaultContent, setElementContent } = useEditInterfaceContext();

  // Form state
  const [errors, setErrors] = useState({});
  const [newSwagName, setNewSwagName] = useState('');
  const [newSwagOption, setNewSwagOption] = useState('');
  const [newSwagOptions, setNewSwagOptions] = useState([]);

  // Form handlers
  const setOptOutDefault = () => {
    setElementContent({
      ...elementContent,
      optOutDefault: !elementContent?.optOutDefault
    });
  };

  console.log('that element content', elementContent);

  const addNewSwag = () => {
    const newSwag = {
      swagName: newSwagName,
      swagOptions: newSwagOptions
    };

    if (elementContent.swags.find((swag) => swag.swagName === newSwag.swagName)) {
      setErrors({
        ...errors,
        newSwagName: 'This name is already in use'
      });
      return;
    }

    setElementContent({
      ...elementContent,
      swags: [...elementContent.swags, newSwag]
    });
    clearNewSwag();
  };

  const clearNewSwag = () => {
    setNewSwagName('');
    setNewSwagOptions([]);
  };

  const removeExistingSwag = (swagName) => {
    const thisSwagIndex = elementContent.swags.findIndex((swag) => swag.swagName === swagName);
    const swagsUpdated = [...elementContent.swags];
    swagsUpdated.splice(thisSwagIndex);
    setElementContent({
      ...elementContent,
      swags: swagsUpdated
    });
  };

  const removeExistingSwagOption = (swagName, option) => {
    const swagsUpdated = [...elementContent.swags];
    const thisSwagIndex = swagsUpdated.findIndex((swag) => swag.swagName === swagName);
    const theseOptionsMinus = swagsUpdated[thisSwagIndex].swagOptions.filter((opt) => opt !== option);
    swagsUpdated[thisSwagIndex].swagOptions = theseOptionsMinus;
    setElementContent({
      ...elementContent,
      swags: swagsUpdated
    });
  };

  // New Swag

  const addNewSwagOption = () => {
    if (!newSwagOption) return;
    if (newSwagOptions.includes(newSwagOption)) {
      setErrors({
        ...errors,
        newSwagOption: 'That option already exists'
      });
      return;
    }
    setNewSwagOptions([...newSwagOptions, newSwagOption]);
    setNewSwagOption('');
  };

  const removeNewSwagOption = (option) => {
    const newSwagOptionsWithout = [...newSwagOptions.filter((so) => so !== option)];
    setNewSwagOptions([...newSwagOptionsWithout]);
  };

  const handleKeyUpOptionName = (e) => {
    if (e.key === 'Enter') addNewSwagOption(newSwagOption);
  };

  console.log('elementContent', elementContent);

  return (
    <S.SwagEditor data-testid="swag-editor">
      <S.OptOutDefault>
        <S.Checkbox
          id="opt-out-default"
          data-testid="opt-out-default"
          type="checkbox"
          color={theme.colors.primary}
          checked={elementContent?.optOutDefault}
          onChange={setOptOutDefault}
        />
        <S.CheckboxLabel htmlFor="opt-out-default">"Opt-out of swag" checked by default?</S.CheckboxLabel>
      </S.OptOutDefault>
      <S.Swags>
        {elementContent.swags.map((swag) => (
          <S.Swag key={swag.swagName}>
            <S.SwagNameWrapper>
              <S.SwagName>{swag.swagName}</S.SwagName>
              <S.DeleteButton
                onClick={() => removeExistingSwag(swag.swagName)}
                data-testid={`remove-existing-swag-${swag.swagName}`}
              >
                <S.TrashIcon icon={faTrash} />
              </S.DeleteButton>
            </S.SwagNameWrapper>
            <S.SwagOptions>
              {swag.swagOptions?.map((option) => (
                <S.SwagOption key={option}>
                  {option}{' '}
                  <XButton
                    onClick={() => removeExistingSwagOption(swag.swagName, option)}
                    data-testid={`remove-existing-swag-option-${option}`}
                  />
                </S.SwagOption>
              ))}
            </S.SwagOptions>
          </S.Swag>
        ))}
        {elementContent.swags.length === 0 && <S.NoSwags>Add a swag item below</S.NoSwags>}
      </S.Swags>
      {elementContent.swags.length < SWAG_LIMIT && (
        <S.AddSwag>
          <S.AddSwagWrapper>
            <S.SwagNameInput
              type="text"
              placeholder="Swag name"
              value={newSwagName}
              onChange={(e) => setNewSwagName(e.target.value)}
              data-testid="swag-name-input"
            />
            <FormErrors errors={errors.newSwagName} />
            {/* <S.SwagOptionsDescription>Add swag options? (e.g. "sm", "lg", "2XL")</S.SwagOptionsDescription> */}
            <S.AddSwagOptions>
              {newSwagOptions.map((newOption) => (
                <S.SwagOption key={newOption}>
                  {newOption}{' '}
                  <XButton
                    onClick={() => removeNewSwagOption(newOption)}
                    data-testid={`remove-new-swag-option-${newOption}`}
                  />
                </S.SwagOption>
              ))}
              <S.SwagOption>
                <S.OptionNameInput
                  value={newSwagOption}
                  onChange={(e) => setNewSwagOption(e.target.value)}
                  onKeyUp={handleKeyUpOptionName}
                />
                <PlusButton onClick={addNewSwagOption} data-testid="add-new-swag-option" />
                <FormErrors errors={errors.newSwagOption} />
              </S.SwagOption>
            </S.AddSwagOptions>
          </S.AddSwagWrapper>
          <S.AddSwagButtons>
            <PlusButton onClick={addNewSwag} data-testid="add-new-swag" />
            <XButton onClick={clearNewSwag} data-test="clear-new-swag" />
          </S.AddSwagButtons>
        </S.AddSwag>
      )}
    </S.SwagEditor>
  );
}

SwagEditor.for = 'DSwag';

export default SwagEditor;

const NOT_ENOUGH_SWAGS = 'You must define at least one swag';

SwagEditor.hasErrors = (content) => {
  if (!content?.swags || content.swags.length === 0) {
    return NOT_ENOUGH_SWAGS;
  }
  return false;
};
