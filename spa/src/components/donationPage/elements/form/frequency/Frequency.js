import clsx from 'clsx';
import PropTypes from 'prop-types';
import { useFormContext } from 'react-hook-form';

function Frequency({ displayName, helperText, name, required, frequencyOptions, defaultCheckedIndex }) {
  const { register } = useFormContext();

  return (
    <fieldset data-testid="frequency-component" className="w-full ">
      <legend className="w-full">
        <h2 className="text-3xl">{displayName}</h2>
        <p className="mb-3">{helperText}</p>
        <div className={clsx('flex justify-between max-w-sm')}>
          {frequencyOptions.map(({ displayName, value }, key) => {
            const id = `${name}-${value}`;
            return (
              <label htmlFor={id} key={id}>
                <input
                  {...register(name)}
                  name={name}
                  id={id}
                  type="radio"
                  value={value}
                  defaultChecked={key === defaultCheckedIndex}
                  className="mr-3"
                  required={required}
                />
                {displayName}
              </label>
            );
          })}
        </div>
      </legend>
    </fieldset>
  );
}

Frequency.propTypes = {
  displayName: PropTypes.string.isRequired,
  helperText: PropTypes.string,
  name: PropTypes.string.isRequired,
  required: PropTypes.bool,
  frequencyOptions: PropTypes.arrayOf(
    PropTypes.shape({ displayName: PropTypes.string.isRequired, value: PropTypes.string.isRequired })
  ),
  defaultCheckedIndex: PropTypes.number
};

Frequency.defaultProps = {
  displayName: 'Frequency',
  helperText: 'Choose a contribution type',
  name: 'contribution-frequency',
  required: true,
  defaultCheckedIndex: 0
};

Frequency.type = 'DFrequency';
Frequency.displayName = 'Contribution frequency';
Frequency.description = 'Allow donors to select a frequency at which to contribute';
Frequency.required = true;
Frequency.unique = true;

export default Frequency;
