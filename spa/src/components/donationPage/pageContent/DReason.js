import { useState } from 'react';
import PropTypes from 'prop-types';
import { useTheme } from 'styled-components';
import { motion } from 'framer-motion';

// Styles
import * as S from './DReason.styled';
import { AnimatePresence } from 'framer-motion';

// Context
import { usePage } from '../DonationPage';
import DElement, { DynamicElementPropTypes } from 'components/donationPage/pageContent/DElement';

// Children
import GroupedLabel from 'elements/inputs/GroupedLabel';
import { InputGroup, GroupedWrapper } from 'elements/inputs/inputElements.styled';
import Select from 'elements/inputs/Select';

const defaultTributeState = {
  isHonoree: false,
  isInMemoryOf: false
};

export const REASON_OPTION_MAX_LENGTH = 255;
const NO_REASON_OPT = '-- Select one --';
const REASON_OTHER = 'Other';

function DReason({ element, ...props }) {
  const { errors } = usePage();

  // Form state
  const [selectedReason, setSelectedReason] = useState('');
  const [reasonOther, setReasonOther] = useState('');
  const [tributeState, setTributeState] = useState(defaultTributeState);
  const [tributeInput, setTributeInput] = useState('');

  // Form control
  const handleTributeSelection = (selectedOption, value) => {
    if (!selectedOption) {
      setTributeState(defaultTributeState);
    } else {
      setTributeState({
        ...defaultTributeState,
        [selectedOption]: !tributeState[selectedOption]
      });
    }
  };

  const getReasons = () => {
    const reasons = [...element.content.reasons];
    if (element?.requiredFields?.includes('reason_for_giving')) reasons.unshift(NO_REASON_OPT);
    reasons.push(REASON_OTHER);
    return reasons;
  };

  const elementContent = element?.content || {};

  return (
    <DElement label="Reason for giving" {...props} data-testid="d-reason">
      <S.ReasonGroup>
        {elementContent.askReason && (
          <InputGroup>
            <GroupedLabel required={element?.requiredFields?.includes('reason_for_giving')}>
              I support your work because...
            </GroupedLabel>
            <S.SupportOptions>
              {elementContent.reasons.length > 0 && (
                <Select
                  testId="excited-to-support-picklist"
                  name="reason_for_giving"
                  selectedItem={selectedReason}
                  onSelectedItemChange={({ selectedItem }) => setSelectedReason(selectedItem)}
                  items={getReasons()}
                  errors={errors?.reason_for_giving}
                />
              )}
              <AnimatePresence>
                {(elementContent.reasons?.length === 0 || selectedReason === REASON_OTHER) && (
                  <motion.div {...S.inputAnimations}>
                    <S.ReasonOtherInput
                      placeholder="Tell us why you suport our work"
                      value={reasonOther}
                      name="reason_other"
                      onChange={(e) => setReasonOther(e.target.value)}
                      maxLength={REASON_OPTION_MAX_LENGTH}
                      errors={errors.reason_other}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </S.SupportOptions>
          </InputGroup>
        )}
      </S.ReasonGroup>
      {(elementContent.askHonoree || elementContent.askInMemoryOf) && (
        <TributeSelector
          elementContent={elementContent}
          tributeState={tributeState}
          handleSelection={handleTributeSelection}
          inputValue={tributeInput}
          handleInputChange={(e) => setTributeInput(e.target.value)}
          errors={errors}
        />
      )}
    </DElement>
  );
}

DReason.propTypes = {
  element: PropTypes.shape({
    ...DynamicElementPropTypes
  })
};

DReason.type = 'DReason';
DReason.displayName = 'Reason for Giving';
DReason.description = 'Collect information about the donors reason for giving';
DReason.required = false;
DReason.unique = true;

export default DReason;

function TributeSelector({
  elementContent = {},
  tributeState,
  handleSelection,
  inputValue,
  handleInputChange,
  errors
}) {
  const showTributeInput = tributeState.isHonoree || tributeState.isInMemoryOf;

  return (
    <InputGroup>
      <GroupedLabel>Is this gift a tribute?</GroupedLabel>
      {elementContent.askHonoree && elementContent.askInMemoryOf && (
        <GroupedWrapper>
          <TributeCheckbox
            asRadio
            label="No"
            name="tribute_type"
            checked={!tributeState.isHonoree && !tributeState.isInMemoryOf}
            handleChange={(e) => handleSelection('', e.target.value)}
            value=""
          />
          <TributeCheckbox
            asRadio
            label="Yes, in honor of..."
            name="tribute_type"
            checked={tributeState.isHonoree}
            handleChange={(e) => handleSelection('isHonoree', e.target.value)}
            value="type_honoree"
          />
          <TributeCheckbox
            asRadio
            label="Yes, in memory of..."
            name="tribute_type"
            checked={tributeState.isInMemoryOf}
            handleChange={(e) => handleSelection('isInMemoryOf', e.target.value)}
            value="type_in_memory_of"
          />
        </GroupedWrapper>
      )}
      {elementContent.askHonoree && !elementContent.askInMemoryOf && (
        <S.SingleOption>
          <TributeCheckbox
            label="Give in honor of..."
            name="tribute_type_honoree"
            checked={tributeState.isHonoree}
            handleChange={(e) => handleSelection('isHonoree', e.target.value)}
          />
        </S.SingleOption>
      )}
      {elementContent.askInMemoryOf && !elementContent.askHonoree && (
        <S.SingleOption>
          <TributeCheckbox
            label="Give in memory of..."
            name="tribute_type_in_memory_of"
            checked={tributeState.isInMemoryOf}
            handleChange={(e) => handleSelection('isInMemoryOf', e.target.value)}
          />
        </S.SingleOption>
      )}
      <AnimatePresence>
        {showTributeInput && (
          <motion.div {...S.inputAnimations}>
            <S.TributeInput
              testid="tribute-input"
              name={tributeState.isInMemoryOf ? 'in_memory_of' : 'honoree'}
              placeholder={tributeState.isInMemoryOf ? 'In memory of...' : 'In honor of...'}
              value={inputValue}
              onChange={handleInputChange}
              errors={errors[tributeState.isInMemoryOf ? 'in_memory_of' : 'honoree']}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </InputGroup>
  );
}

function TributeCheckbox({ value, label, name, checked, handleChange, asRadio }) {
  const theme = useTheme();

  return (
    <S.CheckBoxField>
      {asRadio ? (
        <S.Radio
          data-testid={`tribute-${value}`}
          id={value}
          checked={checked}
          onChange={handleChange}
          value={value}
          name={name}
          style={{
            color: theme.colors.primary
          }}
        />
      ) : (
        <S.Checkbox
          data-testid={`tribute-${value}`}
          id={name}
          type="checkbox"
          name={name}
          style={{
            color: theme.colors.primary
          }}
          checked={checked}
          onChange={handleChange}
        />
      )}
      <S.CheckboxLabel htmlFor={asRadio ? value : name}>{label}</S.CheckboxLabel>
    </S.CheckBoxField>
  );
}
