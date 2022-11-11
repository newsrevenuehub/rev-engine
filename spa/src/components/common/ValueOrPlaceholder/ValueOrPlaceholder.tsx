import PropTypes, { InferProps } from 'prop-types';
import { NO_VALUE } from 'constants/textConstants';

const ValueOrPlaceholderPropTypes = {
  children: PropTypes.node.isRequired,
  value: PropTypes.any
};

export type ValueOrPlaceholderProps = InferProps<typeof ValueOrPlaceholderPropTypes>;

/**
 * Shows children or a placeholder string depending on the value prop.
 */
export function ValueOrPlaceholder({ children, value }: ValueOrPlaceholderProps) {
  if (!!value) {
    return <>{children}</>;
  }

  return <>{NO_VALUE}</>;
}

ValueOrPlaceholder.propTypes = ValueOrPlaceholderPropTypes;
export default ValueOrPlaceholder;
