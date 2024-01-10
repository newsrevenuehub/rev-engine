import { Button } from 'components/base';
import PropTypes, { InferProps } from 'prop-types';
import { Root } from './ContributionFetchError.styled';

const ContributionFetchErrorPropTypes = {
  message: PropTypes.string.isRequired,
  onRetry: PropTypes.func.isRequired
};

export interface ContributionFetchErrorProps extends InferProps<typeof ContributionFetchErrorPropTypes> {
  onRetry: () => void;
}

export function ContributionFetchError({ message, onRetry }: ContributionFetchErrorProps) {
  return (
    <Root>
      <p>{message}</p>
      <Button onClick={onRetry} color="error">
        Try Again
      </Button>
    </Root>
  );
}

ContributionFetchError.propTypes = ContributionFetchErrorPropTypes;
export default ContributionFetchError;
