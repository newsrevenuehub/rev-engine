import { useState } from 'react';
import PropTypes from 'prop-types';
import { useTheme } from 'styled-components';

// Styles
import * as S from './DReason.styled';
import { AnimatePresence } from 'framer-motion';

// Context
import { usePage } from '../DonationPage';
import DElement, { DynamicElementPropTypes } from 'components/donationPage/pageContent/DElement';

// Children
import Select from 'elements/inputs/Select';

const defaultTributeState = {
  isHonoree: false,
  isInMemoryOf: false
};

export const REASON_OPTION_MAX_LENGTH = 255;
const NO_REASON_OPT = '-- Select one --';
const REASON_OTHER = 'Other';

function DReason({ element, ...props }) {
  // const { page, frequency, amount } = usePage();

  // Form state
  const [selectedReason, setSelectedReason] = useState('');
  const [reasonOther, setReasonOther] = useState('');
  const [tributeState, setTributeState] = useState(defaultTributeState);
  const [tributeInput, setTributeInput] = useState('');

  console.log('element', element);

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

  // const handleTributeInput = (key, value) => {
  //   console.log(key, ': ', value);
  // };

  const getReasons = () => {
    const reasons = [...element.content.reasons];
    if (!element.content.reasonRequired) reasons.unshift(NO_REASON_OPT);
    reasons.push(REASON_OTHER);
    return reasons;
  };

  return (
    <DElement label="What inspired you to give?" {...props} data-testid="d-reason">
      <S.DReason>
        {element.content?.askReason && (
          <S.SupportSection>
            <S.SupportSelect>
              <S.SupportLabel>I'm excited to support...</S.SupportLabel>
              <S.SupportOptions>
                {element.content.reasons.length > 0 && (
                  <Select
                    testId="excited-to-support"
                    name="reason_for_giving"
                    selectedItem={selectedReason}
                    onSelectedItemChange={({ selectedItem }) => setSelectedReason(selectedItem)}
                    items={getReasons()}
                  />
                )}
                <AnimatePresence>
                  {(element.content.reasons.length === 0 || selectedReason === REASON_OTHER) && (
                    <S.ReasonOtherInput
                      placeholder="What's got you excited to give?"
                      value={reasonOther}
                      onChange={(e) => setReasonOther(e.target.value)}
                      maxLength={REASON_OPTION_MAX_LENGTH}
                      {...S.inputAnimations}
                    />
                  )}
                </AnimatePresence>
              </S.SupportOptions>
            </S.SupportSelect>
          </S.SupportSection>
        )}
        <S.TributeSection>
          <TributeSelector
            elementContent={element.content}
            tributeState={tributeState}
            handleSelection={handleTributeSelection}
            inputValue={tributeInput}
            handleInputChange={(e) => setTributeInput(e.target.value)}
          />
        </S.TributeSection>
      </S.DReason>
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

function TributeSelector({ elementContent = {}, tributeState, handleSelection, inputValue, handleInputChange }) {
  const showTributeInput = tributeState.isHonoree || tributeState.isInMemoryOf;

  return (
    <S.TributeSelector>
      <S.TributeHeading>Is this gift a tribute?</S.TributeHeading>
      {elementContent.askHonoree && elementContent.askInMemoryOf && (
        <S.BothOptions>
          <TributeCheckbox
            asRadio
            label="No"
            name="reason_for_giving"
            checked={!tributeState.isHonoree && !tributeState.isInMemoryOf}
            handleChange={(e) => handleSelection('', e.target.value)}
            value=""
          />
          <TributeCheckbox
            asRadio
            label="Yes, in honor of..."
            name="reason_for_giving"
            checked={tributeState.isHonoree}
            handleChange={(e) => handleSelection('isHonoree', e.target.value)}
            value="isHonoree"
          />
          <TributeCheckbox
            asRadio
            label="Yes, in memory of..."
            name="reason_for_giving"
            checked={tributeState.isInMemoryOf}
            handleChange={(e) => handleSelection('isInMemoryOf', e.target.value)}
            value="isInMemoryOf"
          />
        </S.BothOptions>
      )}
      {elementContent.askHonoree && !elementContent.askInMemoryOf && (
        <S.SingleOption>
          <TributeCheckbox
            label="Give in honor of..."
            name="honoree"
            checked={tributeState.isHonoree}
            handleChange={(e) => handleSelection('isHonoree', e.target.value)}
          />
        </S.SingleOption>
      )}
      {elementContent.askInMemoryOf && !elementContent.askHonoree && (
        <S.SingleOption>
          <TributeCheckbox
            label="Give in memory of..."
            name="in_memory_of"
            checked={tributeState.isInMemoryOf}
            handleChange={(e) => handleSelection('isInMemoryOf', e.target.value)}
          />
        </S.SingleOption>
      )}
      <AnimatePresence>
        {showTributeInput && (
          <S.TributeInput
            name={tributeState.isInMemoryOf ? 'in_memory_of' : 'honoree'}
            placeholder="Name"
            value={inputValue}
            onChange={handleInputChange}
            {...S.inputAnimations}
          />
        )}
      </AnimatePresence>
    </S.TributeSelector>
  );
}

function TributeCheckbox({ value, label, name, checked, handleChange, asRadio }) {
  const theme = useTheme();

  return (
    <S.CheckBoxField>
      {asRadio ? (
        <S.Radio
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
          id={name}
          data-testid={name}
          type="checkbox"
          name={name}
          style={{
            color: theme.colors.primary
          }}
          checked={checked}
          // inputProps={{ 'aria-label': 'controlled' }}
          onChange={handleChange}
        />
      )}
      <S.CheckboxLabel htmlFor={asRadio ? value : name}>{label}</S.CheckboxLabel>
    </S.CheckBoxField>
  );
}
