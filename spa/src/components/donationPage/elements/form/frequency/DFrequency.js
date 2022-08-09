import PropTypes from 'prop-types';
import * as S from './DFrequency.styled';

function ContributionFrequencySelector({ labelText, helperText }) {
  const handleFrequencySelected = (e, checked) => {
    const value = e.target.value;
    if (checked) {
      setOverrideAmount(false);
      setAmount(getDefaultAmountForFreq(value, page));
      setFrequency(value);
    }
  };

  return (
    <fieldset>
      <legend>
        <h2>{labelText}</h2>
        <p>{helperText}</p>
        {presetAmounts.map(({ amount, displayValue }, idx) => {
          return (
            <label>
              <input
                onChange={handleChange}
                type="radio"
                name={INPUT_NAME}
                value={amount}
                key={`amont-option-${idx}`}
              />
              {displayValue}
            </label>
          );
        })}
        {allowUserSetValue && (
          <input onChange={handleChange} type="text" name={INPUT_NAME} defaultValue={defaultUserSetValue} step="0.01" />
        )}
      </legend>
      {errors.email && <span role="alert">{errors.email.message}</span>}
    </fieldset>
  );
  return (
    <DElement label="Frequency" {...props} data-testid="d-frequency">
      <InputGroup>
        <GroupedLabel>Choose a contribution type</GroupedLabel>
        <GroupedWrapper>
          {element?.content?.sort(frequencySort).map((freq) => (
            <S.CheckBoxField key={freq.value}>
              <S.Radio
                id={freq.value}
                name="interval"
                value={freq.value}
                checked={frequency === freq.value}
                onChange={handleFrequencySelected}
                data-testid={`frequency-${freq.value}${frequency === freq.value ? '-selected' : ''}`}
              />
              <S.CheckboxLabel htmlFor={freq.value}>{freq.displayName}</S.CheckboxLabel>
            </S.CheckBoxField>
          ))}
        </GroupedWrapper>
        <FormErrors errors={errors.interval} />
      </InputGroup>
    </DElement>
  );
}

DFrequency.propTypes = {
  element: PropTypes.shape({
    ...DynamicElementPropTypes,
    content: PropTypes.arrayOf(
      PropTypes.shape({ displayName: PropTypes.string.isRequired, value: PropTypes.string.isRequired })
    )
  })
};

DFrequency.type = 'DFrequency';
DFrequency.displayName = 'Contribution frequency';
DFrequency.description = 'Allow donors to select a frequency at which to contribute';
DFrequency.required = true;
DFrequency.unique = true;

export default DFrequency;

export function frequencySort(a, b) {
  const sortOrder = ['one_time', 'month', 'year'];
  const aVal = a.value;
  const bVal = b.value;

  if (sortOrder.indexOf(aVal) > sortOrder.indexOf(bVal)) {
    return 1;
  } else {
    return -1;
  }
}

export const validator = {
  // [INPUT_NAME]: Yup.number().max().min().when('')
  // [USER_SET_INPUT_NAME]: Yup.number()
};
