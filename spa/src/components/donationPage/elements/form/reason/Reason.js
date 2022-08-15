import { useRef } from 'react';
import PropTypes from 'prop-types';
import { Controller, useFormContext } from 'react-hook-form';
import { Select, MenuItem } from '@material-ui/core';

import TributeRadio from './TributeRadio';
import LabeledInput from 'elements/inputs/LabeledInput';

function Reason({
  legendHeading,
  reasonPromptDisplay,
  reasonPromptName,
  reasonPromptLabelText,
  reasonPromptRequired,
  reasonPromptOptions,
  reasonPromptOtherOptionLabelText,
  reasonPromptOtherOptionValue,
  reasonPromptOtherInputPlaceholder,
  reasonPromptOtherInputLabelText,
  reasonPromptOtherInputName,
  inHonorDisplay,
  // name of input, not honoree
  inHonorName,
  inHonorPlaceholder,
  inMemoryDisplay,
  inMemoryPlaceholder,
  // name of input, not memoree
  inMemoryName
}) {
  const {
    control,
    watch,
    formState: { errors }
  } = useFormContext();

  const chosenReasonOption = watch(reasonPromptName);
  const displayTributeChoiceInput = inMemoryDisplay || inHonorDisplay;
  const { inHonorOfValue, inMemoryOfValue, name: tributeRadioName } = TributeRadio.defaultProps;
  const tributeRadioChoice = watch(tributeRadioName);
  const selectRef = useRef(null);
  return (
    <fieldset className="w-full max-w-md">
      <legend className="w-full">
        <h2 className="text-3xl mb-4">{legendHeading}</h2>
        {reasonPromptDisplay && (
          <div className="flex flex-col gap-3">
            {/* https://v4.mui.com/components/selects/#accessibility -- id and labelId => mui doing the a11y thing*/}
            <label id="reason-reasons-select">{reasonPromptLabelText}</label>
            <Controller
              name={reasonPromptName}
              control={control}
              render={({ field: { onChange, value } }) => (
                <Select
                  required={reasonPromptRequired}
                  variant="outlined"
                  // onChange={(e) => {
                  //   // selectRef.current.value
                  //   console.log(e.target.value);
                  //   onChange(e);
                  //   //
                  // }}
                  inputRef={selectRef}
                  value={value}
                  displayEmpty
                  labelId="reason-reasons-select"
                >
                  {[
                    { labelText: reasonPromptOtherOptionLabelText, value: reasonPromptOtherOptionValue },
                    ...reasonPromptOptions
                  ].map(({ labelText, value }, key) => {
                    return (
                      <MenuItem key={`${key}{value}`} value={value}>
                        {labelText}
                      </MenuItem>
                    );
                  })}
                </Select>
              )}
            />
            {chosenReasonOption === reasonPromptOtherOptionValue && (
              <LabeledInput
                visuallyHideLabel={true}
                labelText={reasonPromptOtherInputLabelText}
                name={reasonPromptOtherInputName}
                placeholder={reasonPromptOtherInputPlaceholder}
                required={false}
              />
            )}
          </div>
        )}
        {displayTributeChoiceInput && (
          <div>
            <TributeRadio inMemoryDisplay={inMemoryDisplay} inHonorDisplay={inHonorDisplay} />
            {tributeRadioChoice === inMemoryOfValue && (
              <LabeledInput
                name={inMemoryName}
                placeholder={inMemoryPlaceholder}
                visuallyHideLabel={true}
                labelText={inMemoryPlaceholder}
                required={inMemoryDisplay}
              />
            )}
            {tributeRadioChoice === inHonorOfValue && (
              <LabeledInput
                name={inHonorName}
                placeholder={inHonorPlaceholder}
                visuallyHideLabel={true}
                labelText={inHonorPlaceholder}
                required={inHonorDisplay}
              />
            )}
          </div>
        )}
      </legend>
    </fieldset>
  );
}

Reason.propTypes = {
  reasonPromptName: PropTypes.string.isRequired,
  reasonPromptDisplay: PropTypes.bool.isRequired,
  reasonPromptLabelText: PropTypes.string.isRequired,
  reasonPromptPlaceholder: PropTypes.string.isRequired,
  reasonPromptOtherOptionValue: PropTypes.string.isRequired,
  reasonPromptRequired: PropTypes.bool.isRequired,
  reasonPromptOtherOptionLabelText: PropTypes.string.isRequired,
  reasonPromptOptions: PropTypes.arrayOf(
    PropTypes.shape({
      labelText: PropTypes.string.isRequired,
      value: PropTypes.string.isRequired
    })
  ),
  reasonPromptOtherInputPlaceholder: PropTypes.string.isRequired,
  reasonPromptOtherInputName: PropTypes.string.isRequired,
  reasonPromptOtherInputLabelText: PropTypes.string.isRequired,
  inHonorDisplay: PropTypes.bool.isRequired,
  inHonorPlaceholder: PropTypes.string.isRequired,
  inHonorName: PropTypes.string.isRequired,
  inMemoryDisplay: PropTypes.bool.isRequired,
  inMemoryPlaceholder: PropTypes.string.isRequired,
  inMemoryName: PropTypes.string.isRequired
};

Reason.defaultProps = {
  reasonPromptName: 'contribution-reason',
  legendHeading: 'Reason for giving',
  reasonPromptDisplay: false,
  reasonPromptLabelText: 'I support your work because...',
  reasonPromptPlaceholder: 'Select a reason',
  reasonPromptOtherInputPlaceholder: 'Tell us why you support our work',
  reasonPromptOtherInputName: 'other-reason',
  reasonPromptOtherInputLabelText: 'Tell us more',
  reasonPromptOtherOptionValue: 'canonical-other-option-value',
  reasonPromptRequired: false,
  reasonPromptOptions: [],
  reasonPromptOtherOptionLabelText: 'Other',
  inHonorDisplay: false,
  inHonorPlaceholder: 'In honor of...',
  inHonorName: 'in-honor-of',
  inMemoryDisplay: false,
  inMemoryName: 'in-memory-of',
  inMemoryPlaceholder: 'In memory of...',
  helperText: 'Paying the Stripe transaction fee, while not required, directs more money in support of our mission.',
  defaultChecked: false
};

export default Reason;
