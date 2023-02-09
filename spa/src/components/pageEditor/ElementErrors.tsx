import PropTypes, { InferProps } from 'prop-types';

const ElementErrorsPropTypes = {
  errors: PropTypes.array.isRequired
};

export interface ElementError {
  element: string;
  message: string;
}

export interface ElementErrorsProps extends InferProps<typeof ElementErrorsPropTypes> {
  errors: ElementError[];
}

export function ElementErrors({ errors }: ElementErrorsProps) {
  if (errors.length === 0) {
    return null;
  }

  return (
    <>
      The following elements are required for your page to function properly:
      <ul>
        {errors.map((error) => (
          <li key={error.element}>{error.message}</li>
        ))}
      </ul>
    </>
  );
}

ElementErrors.propTypes = ElementErrorsPropTypes;

export default ElementErrors;
