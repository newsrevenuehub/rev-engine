import { indexOf } from 'lodash';
import { useState } from 'react';
import { Controller } from 'react-hook-form';

import { INPUT_NAME } from './constants';

function Amount({
  control,
  labelText,
  presetAmounts,
  defaultPresetIndex = 0,
  defaultUserInputValue = '',
  allowUserSetValue = true,
  helperText = "Select how much you'd like to contribute",
  onValueChange // callback to parent context
}) {
  const presetDefaultValue = presetAmounts?.[defaultPresetIndex]?.value;
  const userSetDefaultValue = allowUserSetValue && defaultUserInputValue;
  const [currentPresetValue, setCurrentPresetValue] = useState(presetDefaultValue || null);
  const [currentUserSetValue, setCurrentUserSetValue] = useState(userSetDefaultValue || '');

  const handlePresetChange = ({ target: value }) => {
    setCurrentUserSetValue('');
    setCurrentPresetValue(Number(value.value));
    onValueChange(Number(value.value));
  };

  const handleUserSetChange = ({ target: value }) => {
    setCurrentPresetValue(null);
    setCurrentUserSetValue(value.value);
    onValueChange(Number(value.value));
  };

  return (
    <Controller
      name={INPUT_NAME}
      control={control}
      render={({ field, fieldState: { error } }) => (
        <fieldset>
          <legend>
            <h2 className="text-red-500">{labelText}</h2>
            <p>{helperText}</p>
            <div className="flex gap-4">
              {presetAmounts.map(({ value, displayValue }, key) => {
                if (!value) {
                  debugger;
                }
                return (
                  <label
                    key={`${INPUT_NAME}-preset-${value}`}
                    className="block p-4 bg-violet-500 cursor-pointer hover:bg-violet-600 active:bg-violet-700 focus:outline-none focus:ring focus:ring-violet-300"
                  >
                    <input
                      className="opacity-0 w-0"
                      onChange={handlePresetChange}
                      type="radio"
                      name={`${INPUT_NAME}-preset-${value}`}
                      value={value}
                      checked={!currentUserSetValue && value === Number(currentPresetValue)}
                    />
                    {displayValue}
                  </label>
                );
              })}
              {allowUserSetValue && (
                <input
                  onChange={handleUserSetChange}
                  type="text"
                  name={`${INPUT_NAME}-user-set`}
                  value={currentUserSetValue}
                  step="0.01"
                />
              )}
            </div>
          </legend>
          {error && <span role="alert">{error}</span>}
        </fieldset>
      )}
    />
  );
}

Amount.type = 'DAmount';
Amount.displayName = 'Contribution amount';
Amount.description = 'Allows a donor to select an amount to contribute';

export default Amount;
