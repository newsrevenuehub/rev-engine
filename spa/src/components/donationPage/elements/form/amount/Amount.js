import PropTypes from 'prop-types';
import clsx from 'clsx';
import { useState, useRef } from 'react';
import { Controller, useFormContext } from 'react-hook-form';

function Amount({
  labelText,
  frequency,
  currencySymbol,
  presetAmounts,
  defaultAmount,
  allowUserSetValue,
  helperText,
  name
}) {
  const [userSetInputFocused, setUserSetInputFocused] = useState(false);
  const amountFrequencyString = frequency ? ' / ' + frequency : null;
  const freeFormInput = useRef(null);
  const presetInputs = useRef([]);
  const { control } = useFormContext();

  return (
    <Controller
      defaultValue={defaultAmount || presetAmounts[0]}
      name={name}
      control={control}
      render={({ field: { value: chosenValue, onChange }, fieldState: { error } }) => (
        <div className={clsx('p-4 border-2 rounded', error ? 'border-red-500' : 'border-transparent')}>
          <fieldset>
            <legend className="mb-5">
              <h2 className="text-3xl">{labelText}</h2>
              <p>{helperText}</p>
              <div className={clsx('flex flex-col md:grid md:grid-cols-2 gap-4')}>
                {presetAmounts.map((value, key) => {
                  const isChecked = !userSetInputFocused && value === chosenValue;
                  return (
                    <label
                      htmlFor={`${name}-preset-${value}`}
                      key={`${name}-preset-${value}`}
                      className={clsx(
                        'text-center max-w-64 p-4 rounded bg-gray-200 border border-gray-300 cursor-pointer',
                        isChecked && 'bg-[#20bedd] border-[#1cabc6] text-white'
                      )}
                    >
                      <input
                        name={name}
                        ref={(el) => (presetInputs.current[key] = el)}
                        id={`${name}-preset-${value}`}
                        className="opacity-0 w-0"
                        onClick={(e) => {
                          setUserSetInputFocused(false);
                          if (allowUserSetValue) {
                            freeFormInput.current.value = '';
                          }
                          const roundedValue = Math.round(Number(e.target.value) * 100) / 100;
                          setUserSetInputFocused(false);
                          onChange(roundedValue);
                        }}
                        type="radio"
                        value={value}
                        defaultChecked={value === chosenValue}
                      />
                      {`${currencySymbol}${value}`}
                      {frequency && amountFrequencyString}
                    </label>
                  );
                })}
                {allowUserSetValue && (
                  <div
                    className={clsx(
                      'h-14 rounded flex px-3 justify-center items-center gap-2 border',
                      userSetInputFocused ? 'border-[#20bedd]' : 'border-gray-400',
                      error && 'border-red-400'
                    )}
                  >
                    <span className="font-medium">{currencySymbol}</span>
                    <input
                      onFocus={() => {
                        setUserSetInputFocused(true);
                        presetInputs.current.forEach((input) => (input.checked = false));
                        onChange(freeFormInput.current.value || 0);
                      }}
                      ref={freeFormInput}
                      className={clsx(
                        'bg-transparent focus:outline-none text-center',
                        frequency && 'max-w-[60%] text-left'
                      )}
                      id="user-chosen-value"
                      onChange={({ target: { value } }) => {
                        const roundedValue = Math.round(value * 100) / 100;
                        onChange(roundedValue);
                      }}
                      type="number"
                      placeholder="0.00"
                      step="0.01"
                      defaultValue={defaultAmount}
                    />
                    {amountFrequencyString && <div data-testid="frequency-string">{amountFrequencyString}</div>}
                    <label className="sr-only" htmlFor="user-chosen-value">
                      Choose your own value for amount
                    </label>
                  </div>
                )}
              </div>
            </legend>
            <div className="flex items-center">
              <div
                className={clsx(
                  'h-14 w-full',
                  error &&
                    'mx-auto flex flex-col justify-center bg-red-300 rounded text-center items-middle text-red-900'
                )}
              >
                {error && <span role="alert">{error.message}</span>}
              </div>
            </div>
          </fieldset>
        </div>
      )}
    />
  );
}

// Amount.type = 'DAmount';
// Amount.displayName = 'Contribution amount';
// Amount.description = 'Allows a donor to select an amount to contribute';

Amount.propTypes = {
  labelText: PropTypes.string.isRequired,
  helperText: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  frequency: PropTypes.string,
  currencySymbol: PropTypes.string.isRequired,
  presetAmounts: PropTypes.arrayOf(PropTypes.number).isRequired,
  defaultAmount: PropTypes.number,
  allowUserSetValue: PropTypes.bool.isRequired
};

Amount.defaultProps = {
  labelText: 'Amount',
  frequency: null,
  currencySymbol: '$',
  allowUserSetValue: true,
  helperText: "Select how much you'd like to contribute",
  name: 'amount'
};
export default Amount;
