import clsx from 'clsx';
import PropTypes from 'prop-types';
import { useFormContext } from 'react-hook-form';

import InputError from 'elements/inputs/InputError';

export default function LabeledInput({
  placeholder,
  labelText,
  type = 'text',
  name,
  prefilledValue,
  required = false,
  passedRef
}) {
  const {
    register,
    formState: { errors }
  } = useFormContext();

  // https://react-hook-form.com/faqs#Howtosharerefusage
  const { ref, ...rest } = register(name);

  const error = errors?.[name];
  return (
    <div className={clsx('flex flex-col w-full')}>
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
        {...rest}
        ref={(e) => {
          ref(e);
          if (passedRef) {
            passedRef.current = e;
          }
        }}
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
  type: PropTypes.oneOf(['text', 'email']),
  name: PropTypes.string.isRequired,
  prefilledValue: PropTypes.string,
  required: PropTypes.bool.isRequired,
  passedRef: PropTypes.object
};
