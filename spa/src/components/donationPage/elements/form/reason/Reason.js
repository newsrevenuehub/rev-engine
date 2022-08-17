import { useEffect } from 'react';
import PropTypes from 'prop-types';
import { Controller, useFormContext } from 'react-hook-form';
import { Select } from '@material-ui/core';

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
  const { control, watch, setValue, getValues, resetField } = useFormContext();

  // this is users answer to the dropdown of prompting for reason for support. this dropdown
  // may or may not be displayed. The org can enable/disable this question overall, and they can also
  // decide whether or not to provide a set of options -- one of which will be "Other". In the case of "Other"
  // the user is prompted to type in a reason. If the question is enabled, but no pre-set options defined, the dropdown
  // should not be displayed, but the user should be prompted to provide a reason.
  const displayReasonDropdown = reasonPromptDisplay && reasonPromptOptions.length > 0;

  // this is relevant in case that dropdown is displayed. If chosen reason is "Other", then we conditionally
  // display a text input asking user to explain.
  const chosenReasonOption = watch(reasonPromptName);

  // useEffect here that checks if going from preset to other

  // This covers the case where the user is asked reason for giving, but without preset options. They just
  // should provide text answer.
  useEffect(() => {
    if (reasonPromptOptions.length === 0 && getValues(reasonPromptName) !== reasonPromptOtherOptionValue) {
      setValue(reasonPromptName, reasonPromptOtherOptionValue);
    }
  }, [getValues, reasonPromptName, reasonPromptOptions.length, reasonPromptOtherOptionValue, setValue]);

  // If the user chooses the "Other" option and enters text in the text input, then subsequently
  // changes their answer in dropdown to something other than "Other", we reset the value they provided
  // for the text field, as it's no longer required.
  useEffect(() => {
    if (chosenReasonOption !== reasonPromptOtherOptionValue && getValues(reasonPromptOtherInputName)) {
      resetField(reasonPromptOtherInputName);
    }
  }, [chosenReasonOption, getValues, reasonPromptOtherInputName, reasonPromptOtherOptionValue, resetField]);

  // The org can choose to prompt the user to ask if the contribution is a tribute to someone
  // either living (in which case it's "In honor of") or deceased (in which case it's "In memory of").
  // The expectation is that it will be one or the other but not both. We use the same form section to
  // handle both scenarios, and to do this, we watch the value controlled by a `TributeRadio` component
  // which allows us to conditionally and differentially render the overall Tribute section of the form.
  const displayTributeChoiceInput = inMemoryDisplay || inHonorDisplay;
  const { inHonorOfValue, inMemoryOfValue, noValue, name: tributeRadioName } = TributeRadio.defaultProps;
  const tributeRadioChoice = watch(tributeRadioName);

  // We display the prompt if the user choses "Other" or if the form is configured to prompt for reason but without
  // preset options.
  const displayReasonOtherInput =
    (reasonPromptDisplay && !displayReasonDropdown) || chosenReasonOption === reasonPromptOtherOptionValue;

  // If the user chooses the either "In honor of" or "In memory of" options and enters text in the text input,
  // then subsequently changes their answer in dropdown to something other than "Other", we reset the value
  // they provided for the text field, as it's no longer required.
  useEffect(() => {
    if (tributeRadioChoice === noValue) {
      if (getValues(inMemoryName)) {
        resetField(inMemoryName);
      }
      if (getValues(inHonorName)) {
        resetField(inHonorName);
      }
    }
  }, [getValues, inHonorName, inMemoryName, noValue, resetField, tributeRadioChoice]);

  return (
    <fieldset className="w-full max-w-md">
      <legend className="w-full">
        <h2 className="text-3xl mb-4">{legendHeading}</h2>
        {reasonPromptDisplay && (
          <div className="flex flex-col gap-3 mb-5 ">
            <label
              htmlFor="reason-reasons-select"
              className='after:content-["*"] after:text-red-500 after:text-bold after:ml-1 after:align-middle'
            >
              {reasonPromptLabelText}
            </label>
            {displayReasonDropdown && (
              <Controller
                name={reasonPromptName}
                control={control}
                render={({ field: { onChange } }) => {
                  return (
                    <Select
                      native={true}
                      required={reasonPromptRequired}
                      variant="outlined"
                      onChange={onChange}
                      displayEmpty
                      id="reason-reasons-select"
                    >
                      {[
                        { labelText: '', value: '' },
                        { labelText: reasonPromptOtherOptionLabelText, value: reasonPromptOtherOptionValue },
                        ...reasonPromptOptions
                      ].map(({ labelText, value }, key) => {
                        return (
                          <option key={`${key}{value}`} value={value}>
                            {labelText}
                          </option>
                        );
                      })}
                    </Select>
                  );
                }}
              />
            )}
            {displayReasonOtherInput && (
              <LabeledInput
                visuallyHideLabel={true}
                labelText={reasonPromptOtherInputLabelText}
                name={reasonPromptOtherInputName}
                placeholder={reasonPromptOtherInputPlaceholder}
                required={reasonPromptRequired}
              />
            )}
          </div>
        )}
        {displayTributeChoiceInput && (
          <div>
            <div className="mb-4">
              <TributeRadio inMemoryDisplay={inMemoryDisplay} inHonorDisplay={inHonorDisplay} />
            </div>
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
  helperText: 'Paying the Stripe transaction fee, while not required, directs more money in support of our mission.'
};

export const REASON_OPTION_MAX_LENGTH = 255;

// PRE-EXISTING: probably to support editor view
Reason.type = 'DReason';
Reason.displayName = 'Reason for Giving';
Reason.description = 'Collect information about the donors reason for giving';
Reason.required = false;
Reason.unique = true;

export default Reason;
