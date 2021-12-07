import { useEffect } from 'react';
import { useState, useRef, cloneElement } from 'react';
import * as S from './EditableInput.styled';

function EditableInput({ name, description, field, setField }) {
  const { label, placeholder, inputType } = field;

  return (
    <S.EditableInput>
      <S.Name>{name}</S.Name>
      {description && <S.Description>{description}</S.Description>}

      <Editable value={label} onChange={(val) => setField('label', val)}>
        <S.EditableLabel>{label}</S.EditableLabel>
      </Editable>

      <S.PretendInput>
        <Editable value={placeholder} onChange={(val) => setField('placeholder', val)}>
          <S.EditablePlaceholder>{placeholder}</S.EditablePlaceholder>
        </Editable>
      </S.PretendInput>
    </S.EditableInput>
  );
}

export default EditableInput;

export function useEditableInput() {
  const [fieldValues, setFieldValues] = useState({
    label: 'Label',
    inputType: 'text',
    placeholder: 'Placeholder',
    helpText: 'Help text'
  });

  const _setFieldValues = (field, value) => {
    console.log('setting tho', field, value);
    setFieldValues({
      ...fieldValues,
      [field]: value
    });
  };

  return [fieldValues, _setFieldValues];
}

function Editable({ children, value: initialValue, onChange }) {
  const [innerValue, setInnerValue] = useState(initialValue);
  const [editing, setEditing] = useState(false);

  const handleClickInside = () => {
    setEditing(true);
  };

  const handleClickOutside = () => {
    if (!innerValue) handleClose();
    onChange(innerValue);
    setEditing(false);
  };

  const handleClose = () => {
    setInnerValue(initialValue);
    setEditing(false);
  };

  return (
    <S.Editable>
      {editing ? (
        <InnerInput
          handleClickOutside={handleClickOutside}
          value={innerValue}
          setValue={setInnerValue}
          close={handleClose}
        />
      ) : (
        cloneElement(children, { onClick: handleClickInside })
      )}
    </S.Editable>
  );
}

function InnerInput({ handleClickOutside, close, value, setValue }) {
  const inputRef = useRef();

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, [inputRef]);

  const handleKeyUp = (e) => {
    if (e.key === 'Enter') handleClickOutside();
    if (e.key === 'Escape') close();
  };

  return (
    <S.InnerInput
      ref={inputRef}
      onBlur={handleClickOutside}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyUp={handleKeyUp}
    />
  );
}
