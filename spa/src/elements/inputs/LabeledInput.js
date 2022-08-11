import clsx from 'clsx';
import PropTypes from 'prop-types';
import { useFormContext } from 'react-hook-form';

import InputError from 'elements/inputs/InputError';

export default function LabeledInput({ placeholder, labelText, type, name, prefilledValue, required = false }) {
  const {
    register,
    formState: { errors }
  } = useFormContext();
  const error = errors?.[name];
  return (
    <div className={clsx('flex flex-col w-full max-w-md')}>
      <label
        htmlFor={name}
        className={clsx(
          'mb-2',
          required && 'after:content-["*"] after:text-red-500 after:text-bold after:ml-1 after:align-middle'
        )}
      >
        {labelText}
      </label>
      <input
        {...register(name)}
        className={clsx('mb-4 p-2 border-2 border-gray-300 rounded', error && 'border-red-400 border-2')}
        type={type}
        id={name}
        defaultValue={prefilledValue}
        placeholder={placeholder}
        required={required}
      />
      {error && <InputError message={error.message} />}
    </div>
  );
}

LabeledInput.propTypes = {
  placeholder: PropTypes.string,
  labelText: PropTypes.string.isRequired,
  type: PropTypes.oneOf(['text', 'email']).isRequired,
  name: PropTypes.string.isRequired,
  prefilledValue: PropTypes.string,
  required: PropTypes.bool.isRequired
};
