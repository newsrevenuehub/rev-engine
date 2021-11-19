import { useState } from 'react';
import * as S from './ReasonEditor.styled';
import { useTheme } from 'styled-components';
import { AnimatePresence } from 'framer-motion';

// Constants
import { REASON_OPTION_MAX_LENGTH } from 'components/donationPage/pageContent/DReason';

// Context
import { useEditInterfaceContext } from 'components/pageEditor/editInterface/EditInterface';

// Children
import FormErrors from 'elements/inputs/FormErrors';
import PlusButton from 'elements/buttons/PlusButton';
import XButton from 'elements/buttons/XButton';

const defaultContent = {
  askReason: false,
  reasons: [],

  askHonoree: false,
  askInMemoryOf: false
};

function ReasonEditor() {
  const theme = useTheme();
  const {
    elementContent = defaultContent,
    setElementContent,
    elementRequiredFields,
    setElementRequiredFields
  } = useEditInterfaceContext();

  // Form state
  const [errors, setErrors] = useState({});
  const [newReason, setNewReason] = useState('');

  const toggleElementContent = (key) => {
    setElementContent({
      ...elementContent,
      [key]: !elementContent[key]
    });

    if (key === 'askReason' && !!elementContent[key]) {
      _toggleOffReasonRequired();
    }
  };

  // Form control
  const clearReasonForm = () => {
    setNewReason('');
    setErrors({});
  };

  const addNewReason = () => {
    if (!newReason) return;
    if (elementContent.reasons.includes(newReason)) {
      setErrors({ newReason: 'That option already exists' });
      return;
    }
    setElementContent({
      ...elementContent,
      reasons: [...elementContent.reasons, newReason]
    });
    clearReasonForm();
  };

  const removeReason = (reason) => {
    const updatedReasons = [...elementContent.reasons].filter((r) => r !== reason);
    setElementContent({
      ...elementContent,
      reasons: updatedReasons
    });
  };

  const handleKeyUpNewReason = (e) => {
    if (e.key === 'Enter') addNewReason();
  };

  const toggleReasonRequired = (_e, checked) => {
    if (checked && !elementRequiredFields.includes('reason_for_giving')) {
      setElementRequiredFields([...elementRequiredFields, 'reason_for_giving']);
    } else {
      _toggleOffReasonRequired();
    }
  };

  const _toggleOffReasonRequired = () => {
    setElementRequiredFields(elementRequiredFields.filter((f) => f !== 'reason_for_giving'));
  };

  return (
    <S.ReasonEditor data-testid="reason-editor">
      <S.ReasonsSection isExpanded={!!elementContent.askReason}>
        <S.CheckboxWrapper>
          <S.Checkbox
            id="ask-reason"
            data-testid="ask-reason"
            type="checkbox"
            style={{
              color: theme.colors.primary
            }}
            checked={!!elementContent.askReason}
            onChange={() => toggleElementContent('askReason')}
          />
          <S.CheckboxLabel htmlFor="ask-reason">Ask donor why they are making a contribution</S.CheckboxLabel>
        </S.CheckboxWrapper>
        {elementContent.askReason && (
          <S.CheckboxWrapper>
            <S.Checkbox
              id="reason-required"
              data-testid="reason-required"
              type="checkbox"
              style={{
                color: theme.colors.primary
              }}
              checked={!!elementRequiredFields.includes('reason_for_giving')}
              onChange={toggleReasonRequired}
            />
            <S.CheckboxLabel htmlFor="reason-required">Should filling this out be required?</S.CheckboxLabel>
          </S.CheckboxWrapper>
        )}
        <AnimatePresence>
          {elementContent.askReason && (
            <S.CreateReasons {...S.reasonsAnimation} data-testid="create-reasons">
              <S.ReasonsLabel>
                {elementContent.reasons.length === 0
                  ? 'Add a reason for giving below (optional)'
                  : 'Reasons for giving'}
              </S.ReasonsLabel>
              {elementContent.reasons.map((reason) => (
                <S.ReasonItem key={reason}>
                  {reason} <XButton onClick={() => removeReason(reason)} data-testid={`remove-reason-${reason}`} />
                </S.ReasonItem>
              ))}

              {/* Reason option input */}
              <S.ReasonItem>
                <S.ReasonInput
                  value={newReason}
                  onChange={(e) => setNewReason(e.target.value)}
                  onKeyUp={handleKeyUpNewReason}
                  placeholder="Add a reason for giving"
                  maxLength={REASON_OPTION_MAX_LENGTH}
                />
                <PlusButton onClick={addNewReason} data-testid="add-new-swag-option" />
              </S.ReasonItem>
              <FormErrors errors={errors.newReason} />
            </S.CreateReasons>
          )}
        </AnimatePresence>
      </S.ReasonsSection>
      <S.OtherSection>
        <S.CheckboxWrapper>
          <S.Checkbox
            id="ask-honoree"
            data-testid="ask-honoree"
            type="checkbox"
            style={{
              color: theme.colors.primary
            }}
            checked={!!elementContent.askHonoree}
            onChange={() => toggleElementContent('askHonoree')}
          />
          <S.CheckboxLabel htmlFor="ask-honoree">
            Ask donor if their contribution is in honor of somebody
          </S.CheckboxLabel>
        </S.CheckboxWrapper>
        <S.CheckboxWrapper>
          <S.Checkbox
            id="ask-in-memory-of"
            data-testid="ask-in-memory-of"
            type="checkbox"
            style={{
              color: theme.colors.primary
            }}
            checked={!!elementContent.askInMemoryOf}
            onChange={() => toggleElementContent('askInMemoryOf')}
          />
          <S.CheckboxLabel htmlFor="ask-in-memory-of">
            Ask donor if their contribution is in memory of somebody
          </S.CheckboxLabel>
        </S.CheckboxWrapper>
      </S.OtherSection>
    </S.ReasonEditor>
  );
}

ReasonEditor.for = 'DReason';

const MISSING_REQUIRED = 'Must select at least one option';

ReasonEditor.hasErrors = (content) => {
  if (!content) return MISSING_REQUIRED;
  // Must have at least one of these checked:
  const hasOneRequired = ['askReason', 'askHonoree', 'askInMemoryOf'].some((key) => content[key]);
  if (!hasOneRequired) return MISSING_REQUIRED;
  return false;
};

export default ReasonEditor;
