import { useRef, useState } from 'react';
import * as S from './AdditionalInfoEditor.styled';

// Context
import { useEditInterfaceContext } from 'components/pageEditor/editInterface/EditInterface';

function AdditionalInfoEditor(props) {
  const { elementContent, setElementContent } = useEditInterfaceContext();
  const keyInputRef = useRef();
  const [customKey, setCustomKey] = useState('');
  const [customLabel, setCustomLabel] = useState('');
  const [errors, setErrors] = useState();

  const handleRemoveItem = (item) => {
    const inputs = [...elementContent];
    const inputsWithout = inputs.filter((input) => input.name.toLowerCase() !== item.name.toLowerCase());
    setElementContent(inputsWithout);
  };

  const handleAddItem = () => {
    const key = customKey.trim().toLowerCase();
    const label = customLabel.trim();
    const errors = getInputErrors({ elementContent, key });
    if (errors.length > 0) {
      setErrors(errors);
    } else if (key && label) {
      setErrors([]);
      setElementContent([...elementContent, createAdditionalInput({ label, key })]);
      setCustomKey('');
      setCustomLabel('');
      keyInputRef.current.focus();
    }
  };

  const handleKeyUp = ({ key }) => {
    if (key === 'Enter') handleAddItem();
  };

  return (
    <S.AdditionalInfoEditor>
      <S.Description>Collect arbitrary data from your users by adding form fields to your page.</S.Description>
      <S.Description>Provide a label and a key, which will be used to identify input downstream.</S.Description>
      <S.CurrentInputs>
        {elementContent?.map((existingInput) => (
          <S.CurrentInput key={existingInput.name}>
            <S.CurrentKey>{existingInput.name}:</S.CurrentKey>
            <S.CurrentLabel>{existingInput.label}</S.CurrentLabel>
            <S.XButton type="caution" onClick={() => handleRemoveItem(existingInput)} />
          </S.CurrentInput>
        ))}
      </S.CurrentInputs>
      <S.InputInputs>
        <S.KeyWrapper>
          <S.InputLabel htmlFor="customKey">Key</S.InputLabel>
          <S.InputInput
            ref={keyInputRef}
            value={customKey}
            name="customKey"
            onChange={(e) => setCustomKey(e.target.value)}
            onKeyUp={handleKeyUp}
          />
        </S.KeyWrapper>
        <S.LabelWrapper>
          <S.InputLabel htmlFor="customLabel">Label</S.InputLabel>
          <S.InputInput
            value={customLabel}
            name="customLabel"
            onChange={(e) => setCustomLabel(e.target.value)}
            onKeyUp={handleKeyUp}
          />
        </S.LabelWrapper>
        <S.PlusButton onClick={handleAddItem} />
      </S.InputInputs>
      {errors && errors.length > 0 && errors.map((error) => <S.Error>{error}</S.Error>)}
    </S.AdditionalInfoEditor>
  );
}

AdditionalInfoEditor.for = 'DAdditionalInfo';

export default AdditionalInfoEditor;

AdditionalInfoEditor.hasErrors = function (content) {
  if (content.length === 0) {
    return "Can't add an 'additional information' section without any inputs";
  }
  return false;
};

/**
 * Creates an input in the format expected by the donation page.
 * For now, we only support type "text".
 */
function createAdditionalInput({ key, label }) {
  return { name: key.toLowerCase(), label: label, type: 'text' };
}

function getInputErrors({ elementContent, key }) {
  const errors = [];
  if (elementContent.some((el) => el.name.toLowerCase() === key.toLowerCase())) {
    errors.push(`Cannot create an input with duplicate key "${key}"`);
  }

  if (!/^[a-zA-Z]+$/.test(key)) {
    // Key should only contain letters.
    errors.push('Keys may only contain letters (no spaces)');
  }
  return errors;
}
