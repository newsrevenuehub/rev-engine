import clsx from 'clsx';
import PropTypes from 'prop-types';
import { useFormContext } from 'react-hook-form';

function Frequency({ labelText, defaultValue, helperText, name, required, options, defaultCheckedIndex }) {
  const { register } = useFormContext();

  return (
    <fieldset className="w-full ">
      <legend className="w-full">
        <h2 className="text-3xl">{labelText}</h2>
        <p className="mb-3">{helperText}</p>
        <div className={clsx('flex justify-between max-w-sm')}>
          {options.map(({ labelText, value }, key) => {
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
                {labelText}
              </label>
            );
          })}
        </div>
      </legend>
    </fieldset>
  );
}

Frequency.propTypes = {
  labelText: PropTypes.string.isRequired,
  defaultValue: PropTypes.string,
  helperText: PropTypes.string,
  name: PropTypes.string.isRequired,
  required: PropTypes.bool,
  options: PropTypes.arrayOf(
    PropTypes.shape({ labelText: PropTypes.string.isRequired, value: PropTypes.string.isRequired })
  ),
  defaultCheckedIndex: PropTypes.number
};

Frequency.defaultProps = {
  labelText: 'Frequency',
  helperText: 'Choose a contribution type',
  name: 'contribution-frequency',
  required: true,
  options: [
    { labelText: 'One-time', value: 'one_time' },
    { labelText: 'Monthly', value: 'monthly' },
    { labelText: 'Yearly', value: 'yearly' }
  ],
  defaultCheckedIndex: 0
};

export default Frequency;
