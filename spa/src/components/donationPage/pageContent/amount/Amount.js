import TextField from '@mui/material/TextField';

function Amount({
  defaultValue,
  labelText,
  presetAmounts,
  register,
  errors,
  inputName = 'preset-contribution-amount',
  userSetInputName = 'user-set-contribution-amount',
  allowUserSetValue = true,
  defaultUserSetValue = '',
  helperText = "Select how much you'd like to contribute"
}) {
  return (
    <fieldset>
      <legend>
        <h2>{labelText}</h2>
        <p>{helperText}</p>
        {presetAmounts.map(({ amount, displayValue }, idx) => {
          return (
            <label>
              <input
                {...register(inputName)}
                type="radio"
                name={inputName}
                value={amount}
                key={`amont-option-${idx}`}
              />
              {displayValue}
            </label>
          );
        })}
        {allowUserSetValue && (
          <input
            {...register(userSetInputName)}
            type="text"
            name={userSetInputName}
            defaultValue={defaultUserSetValue}
            step="0.01"
          />
        )}
      </legend>
      {/* errors here */}
    </fieldset>
  );
}

export const validator = {
  'contribution-amount':
}

Amount.type = 'DAmount';
Amount.displayName = 'Contribution amount';
Amount.description = 'Allows a donor to select an amount to contribute';

export default Amount;
