import clsx from 'clsx';
import PropTypes from 'prop-types';
import { useFormContext } from 'react-hook-form';

function TributeRadio({
  name,
  helperText,
  noValue,
  noLabel,
  inHonorOfLabel,
  inHonorOfValue,
  inHonorOfDisplay,
  inMemoryOfLabel,
  inMemoryOfValue,
  inMemoryOfDisplay
}) {
  const { register } = useFormContext();
  const shouldDisplay = inMemoryOfDisplay || inHonorOfDisplay;

  const options = [
    { display: true, labelText: noLabel, value: noValue },
    { display: inHonorOfDisplay, labelText: inHonorOfLabel, value: inHonorOfValue },
    { display: inMemoryOfDisplay, labelText: inMemoryOfLabel, value: inMemoryOfValue }
  ]
    .filter((option) => option.display)
    .map(({ labelText, value }) => ({ labelText, value }));

  return shouldDisplay ? (
    <fieldset className="w-full ">
      <legend className="w-full">
        <h3 className="text-3xl">{helperText}</h3>
        <div className={clsx('flex justify-between max-w-sm')}>
          {options.map(({ labelText, value }) => {
            const id = `${name}-${value}`;
            return (
              <label htmlFor={id} key={id}>
                <input
                  {...register(name)}
                  name={name}
                  id={id}
                  type="radio"
                  value={value}
                  defaultChecked={value === noValue}
                  className="mr-3"
                />
                {labelText}
              </label>
            );
          })}
        </div>
      </legend>
    </fieldset>
  ) : (
    <></>
  );
}

TributeRadio.propTypes = {
  name: PropTypes.string.isRequired,
  helperText: PropTypes.string.isRequired,
  noValue: PropTypes.string.isRequired,
  noLabel: PropTypes.string.isRequired,
  inHonorOfLabel: PropTypes.string.isRequired,
  inHonorOfValue: PropTypes.string.isRequired,
  inHonorOfDisplay: PropTypes.bool.isRequired,
  inMemoryOfLabel: PropTypes.string.isRequired,
  inMemoryOfValue: PropTypes.string.isRequired,
  inMemoryOfDisplay: PropTypes.bool.isRequired
};

TributeRadio.defaultProps = {
  name: 'contribution-tribute',
  helperText: 'Is this gift a tribute?',
  noValue: 'no',
  noLabel: 'No',
  inHonorOfLabel: 'Yes, in honor of...',
  inHonorOfValue: 'in_honor',
  inHonorOfDisplay: false,
  inMemoryOfLabel: 'Yes, in memory of...',
  inMemoryOfValue: 'in_memory',
  inMemoryOfDisplay: false
};

export default TributeRadio;
