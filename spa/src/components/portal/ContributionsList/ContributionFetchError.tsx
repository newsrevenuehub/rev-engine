import { Button } from 'components/base';
import PropTypes, { InferProps } from 'prop-types';
import { Root } from './ContributionFetchError.styled';

const ContributionFetchErrorPropTypes = {
  onRetry: PropTypes.func.isRequired
};

export interface ContributionFetchErrorProps extends InferProps<typeof ContributionFetchErrorPropTypes> {
  onRetry: () => void;
}

export function ContributionFetchError({ onRetry }: ContributionFetchErrorProps) {
  return (
    <Root>
      <p>Error loading contributions.</p>
      <Button onClick={onRetry} color="error">
        Try Again
      </Button>
    </Root>
  );
}

ContributionFetchError.propTypes = ContributionFetchErrorPropTypes;
export default ContributionFetchError;
