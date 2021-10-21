import { useState, useRef, useEffect } from 'react';
import * as S from './SwagEditor.styled';
import { useTheme } from 'styled-components';

// Assets
import { faPencilAlt, faTrash } from '@fortawesome/free-solid-svg-icons';

// Util
import validateInputPositiveFloat from 'utilities/validateInputPositiveFloat';

// Context
import { useEditInterfaceContext } from 'components/pageEditor/editInterface/EditInterface';

// Children/Elements
import { Label } from 'elements/inputs/BaseField.styled';
import FormErrors from 'elements/inputs/FormErrors';
import CheckButton from 'elements/buttons/CheckButton';
import PlusButton from 'elements/buttons/PlusButton';
import XButton from 'elements/buttons/XButton';

const defaultContent = {
  optOutDefault: false,
  swagThreshold: 240,
  swags: []
};

const SWAG_LIMIT = 1;
const SWAG_OPTION_MAX_LENGTH = 40;

function SwagEditor() {
  const theme = useTheme();
  const { elementContent = defaultContent, setElementContent, page } = useEditInterfaceContext();

  const newSwagNameRef = useRef();

  // Form state
  const [errors, setErrors] = useState({});
  const [newSwagName, setNewSwagName] = useState('');
  const [newSwagOption, setNewSwagOption] = useState('');
  const [newSwagOptions, setNewSwagOptions] = useState([]);
  const [editingIndex, setEditingIndex] = useState();

  const isEditing = typeof editingIndex === 'number';

  useEffect(() => {
    if (isEditing && newSwagNameRef.current) {
      newSwagNameRef.current.focus();
      newSwagNameRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isEditing]);

  // Form handlers
  const setOptOutDefault = () => {
    setElementContent({
      ...elementContent,
      optOutDefault: !elementContent?.optOutDefault
    });
  };

  const setOfferNytComp = () => {
    setElementContent({
      ...elementContent,
      offerNytComp: !elementContent?.offerNytComp
    });
  };

  const handleSwagThresholdChange = (e) => {
    if (validateInputPositiveFloat(e.target.value)) {
      setElementContent({
        ...elementContent,
        swagThreshold: e.target.value
      });
    }
  };

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
    setErrors({
      ...errors,
      newSwagName: null
    });
    clearAddEditSwag();
  };

  const clearAddEditSwag = () => {
    setNewSwagName('');
    setNewSwagOptions([]);
    setEditingIndex(null);
  };

  const handleEditExistingSwag = (swag) => {
    setNewSwagName(swag.swagName);
    setNewSwagOptions(swag.swagOptions);
    const thisSwagIndex = elementContent.swags.findIndex((swg) => swg.swagName === swag.swagName);
    setEditingIndex(thisSwagIndex);
  };

  const updateExistingSwag = () => {
    const swagsUpdated = [...elementContent.swags];
    const newSwag = {
      swagName: newSwagName,
      swagOptions: newSwagOptions
    };
    swagsUpdated.splice(editingIndex, 1, newSwag);
    setElementContent({
      ...elementContent,
      swags: swagsUpdated
    });
    clearAddEditSwag();
  };

  const removeExistingSwag = (swagName) => {
    const thisSwagIndex = elementContent.swags.findIndex((swag) => swag.swagName === swagName);
    const swagsUpdated = [...elementContent.swags];
    swagsUpdated.splice(thisSwagIndex, 1);
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
    setErrors({
      ...errors,
      newSwagOption: null
    });
    setNewSwagOption('');
  };

  const removeNewSwagOption = (option) => {
    const newSwagOptionsWithout = [...newSwagOptions.filter((so) => so !== option)];
    setNewSwagOptions([...newSwagOptionsWithout]);
  };

  const handleKeyUpOptionName = (e) => {
    if (e.key === 'Enter') addNewSwagOption(newSwagOption);
  };

  return (
    <S.SwagEditor data-testid="swag-editor">
      {/* Opt out checked by default? */}
      <S.OptOutDefault>
        <S.Checkbox
          id="opt-out-default"
          data-testid="opt-out-default"
          type="checkbox"
          color={theme.colors.primary}
          checked={elementContent.optOutDefault}
          onChange={setOptOutDefault}
        />
        <S.CheckboxLabel htmlFor="opt-out-default">"Opt-out of swag" checked by default?</S.CheckboxLabel>
      </S.OptOutDefault>

      {page.allow_offer_nyt_comp && (
        <S.OfferNytComp>
          <S.Checkbox
            id="offer-nyt-comp"
            data-testid="offer-nyt-comp"
            type="checkbox"
            color={theme.colors.primary}
            checked={!!elementContent.offerNytComp}
            onChange={setOfferNytComp}
          />
          <S.CheckboxLabel htmlFor="offer-nyt-comp">Offer donors a complimentary NYT subscription?</S.CheckboxLabel>
        </S.OfferNytComp>
      )}

      {/* "Benefit threshold", aka swagThreshold */}
      <S.SwagThreshold>
        <Label>Benefit threshold</Label>
        <S.InputContainer>
          {page.currency.symbol}
          <S.ThresholdInput value={elementContent.swagThreshold} onChange={handleSwagThresholdChange} /> /year
        </S.InputContainer>
        <S.HelpText>Total yearly contribution necessary before contributors are offered benefits</S.HelpText>
      </S.SwagThreshold>

      {/* List of current swags */}
      <S.Swags>
        {elementContent.swags.map((swag, i) => (
          <S.Swag key={swag.swagName} isBeingEdited={editingIndex === i} data-testid="existing-swag">
            <S.SwagNameWrapper>
              <S.SwagName>{swag.swagName}</S.SwagName>
              <S.ExistingSwagButtons>
                <S.EditButton
                  onClick={() => handleEditExistingSwag(swag)}
                  data-testid={`edit-existing-swag-${swag.swagName}`}
                >
                  <S.EditIcon icon={faPencilAlt} />
                </S.EditButton>
                <S.DeleteButton
                  onClick={() => removeExistingSwag(swag.swagName)}
                  data-testid={`remove-existing-swag-${swag.swagName}`}
                >
                  <S.TrashIcon icon={faTrash} />
                </S.DeleteButton>
              </S.ExistingSwagButtons>
            </S.SwagNameWrapper>
            <S.SwagOptions>
              {swag.swagOptions?.map((option) => (
                <S.SwagOption key={option}>{option}</S.SwagOption>
              ))}
            </S.SwagOptions>
          </S.Swag>
        ))}
        {elementContent.swags.length === 0 && <S.NoSwags>Add a swag item below</S.NoSwags>}
      </S.Swags>

      {/* Add a new swag */}
      {(isEditing || elementContent.swags.length < SWAG_LIMIT) && (
        <S.AddSwag>
          <S.AddSwagWrapper>
            <S.SwagNameInput
              ref={newSwagNameRef}
              type="text"
              placeholder="Swag name"
              value={newSwagName}
              onChange={(e) => setNewSwagName(e.target.value)}
              testid="swag-name-input"
            />
            <FormErrors errors={errors.newSwagName} />

            {/* New swag options */}
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

              {/* Swag option input */}
              <S.SwagOption>
                <S.OptionNameInput
                  value={newSwagOption}
                  onChange={(e) => setNewSwagOption(e.target.value)}
                  onKeyUp={handleKeyUpOptionName}
                  placeholder="Swag option"
                  maxLength={SWAG_OPTION_MAX_LENGTH}
                />
                <PlusButton onClick={addNewSwagOption} data-testid="add-new-swag-option" />
              </S.SwagOption>
              <S.HelpText>e.g. sm, lg, 2XL</S.HelpText>
              <FormErrors errors={errors.newSwagOption} />
            </S.AddSwagOptions>
          </S.AddSwagWrapper>
          <S.AddSwagButtons>
            {isEditing ? (
              <CheckButton onClick={updateExistingSwag} data-testid="update-existing-swag" />
            ) : (
              <PlusButton onClick={addNewSwag} data-testid="add-new-swag" />
            )}
            <XButton onClick={clearAddEditSwag} data-test="clear-new-swag" />
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
