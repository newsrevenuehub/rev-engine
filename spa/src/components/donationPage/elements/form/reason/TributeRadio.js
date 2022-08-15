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
  inHonorDisplay,
  inMemoryOfLabel,
  inMemoryOfValue,
  inMemoryDisplay
}) {
  const { register } = useFormContext();
  const shouldDisplay = inMemoryDisplay || inHonorDisplay;

  const options = [
    { display: true, labelText: noLabel, value: noValue, defaultChecked: true },
    { display: inHonorDisplay, labelText: inHonorOfLabel, value: inHonorOfValue, defaultChecked: false },
    { display: inMemoryDisplay, labelText: inMemoryOfLabel, value: inMemoryOfValue, defaultChecked: false }
  ]
    .filter((option) => option.display)
    .map(({ labelText, value, defaultChecked }) => ({ labelText, value, defaultChecked }));

  return shouldDisplay ? (
    <fieldset className="w-full ">
      <legend className="w-full">
        <h3 className="text-3xl">{helperText}</h3>
        <div className={clsx('flex justify-between max-w-sm')}>
          {options.map(({ labelText, value, defaultChecked }) => {
            const id = `${name}-${value}`;
            return (
              <label htmlFor={id} key={id}>
                <input
                  {...register(name)}
                  name={name}
                  id={id}
                  type="radio"
                  value={value}
                  defaultChecked={defaultChecked}
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
  inHonorDisplay: PropTypes.bool.isRequired,
  inMemoryOfLabel: PropTypes.string.isRequired,
  inMemoryOfValue: PropTypes.string.isRequired,
  inMemoryDisplay: PropTypes.bool.isRequired
};

TributeRadio.defaultProps = {
  name: 'contribution-tribute',
  helperText: 'Is this gift a tribute?',
  noValue: 'no',
  noLabel: 'No',
  inHonorOfLabel: 'Yes, in honor of...',
  inHonorOfValue: 'in_honor',
  inHonorDisplay: false,
  inMemoryOfLabel: 'Yes, in memory of...',
  inMemoryOfValue: 'in_memory',
  inMemoryDisplay: false
};

export default TributeRadio;
