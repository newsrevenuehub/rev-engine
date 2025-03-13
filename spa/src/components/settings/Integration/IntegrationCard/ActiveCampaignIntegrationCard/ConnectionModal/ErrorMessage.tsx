import PropTypes, { InferProps } from 'prop-types';
import { Icon, Root } from './ErrorMessage.styled';

const ErrorMessagePropTypes = {
  children: PropTypes.node.isRequired
};

export type ErrorMessageProps = InferProps<typeof ErrorMessagePropTypes>;

export function ErrorMessage({ children }: ErrorMessageProps) {
  return (
    <Root>
      <Icon />
      {children}
    </Root>
  );
}

ErrorMessage.propTypes = ErrorMessagePropTypes;
export default ErrorMessage;
