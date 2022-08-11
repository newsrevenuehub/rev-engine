import clsx from 'clsx';
import PropTypes from 'prop-types';

export default function InputError({ message }) {
  return (
    <div
      className={clsx(
        'p-3 w-full',
        message && 'mx-auto flex flex-col justify-center bg-red-300 rounded text-center items-middle text-red-900'
      )}
    >
      {message && <span role="alert">{message}</span>}
    </div>
  );
}

InputError.propTypes = {
  message: PropTypes.string
};
