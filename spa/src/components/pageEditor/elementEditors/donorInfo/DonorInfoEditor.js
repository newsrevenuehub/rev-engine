import * as S from './DonorInfoEditor.styled';

import { AnimatePresence } from 'framer-motion';

// Context
import { useEditInterfaceContext } from 'components/pageEditor/editInterface/EditInterface';

function DonorInfoEditor() {
  const {
    elementContent = {},
    setElementContent,
    elementRequiredFields,
    setElementRequiredFields
  } = useEditInterfaceContext();

  const handleToggleAskPhone = (_e, checked) => {
    setElementContent({
      ...elementContent,
      askPhone: checked
    });

    if (!checked) _toggleOffPhoneRequired();
  };

  const handleToggleRequirePhone = (_e, checked) => {
    if (checked && !elementRequiredFields.includes('phone')) {
      // If "phone" isn't already in requiredFields, add it
      setElementRequiredFields([...elementRequiredFields, 'phone']);
    } else {
      // Ensure "phone" is not in requiredFields
      _toggleOffPhoneRequired();
    }
  };

  const _toggleOffPhoneRequired = () => {
    setElementRequiredFields(elementRequiredFields.filter((f) => f !== 'phone'));
  };

  return (
    <S.DonorInfoEditor data-testid="donor-info-editor">
      <S.OptionsList>
        <S.OptionGroup>
          <S.ToggleWrapper>
            <S.Toggle
              id="ask-phone"
              data-testid="ask-phone"
              checked={!!elementContent.askPhone}
              onChange={handleToggleAskPhone}
            />
            <S.OptionLabel htmlFor="ask-phone">Ask for phone number?</S.OptionLabel>
          </S.ToggleWrapper>
          <AnimatePresence>
            {elementContent.askPhone && (
              <S.CheckboxWrapper {...S.checkboxAnimation}>
                <S.CheckBoxField>
                  <S.Checkbox
                    id="phone-required"
                    data-testid="phone-required"
                    type="checkbox"
                    checked={!!elementRequiredFields.includes('phone')}
                    onChange={handleToggleRequirePhone}
                  />
                  <S.CheckboxLabel htmlFor="phone-required">Required to complete donation?</S.CheckboxLabel>
                </S.CheckBoxField>
              </S.CheckboxWrapper>
            )}
          </AnimatePresence>
        </S.OptionGroup>
      </S.OptionsList>
    </S.DonorInfoEditor>
  );
}

DonorInfoEditor.for = 'DDonorInfo';

export default DonorInfoEditor;
