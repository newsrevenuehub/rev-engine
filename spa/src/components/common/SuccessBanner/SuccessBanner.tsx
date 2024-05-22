import CheckIcon from '@material-design-icons/svg/outlined/check.svg?react';
import PropTypes, { InferProps } from 'prop-types';
import { SuccessMessage } from './SuccessBanner.styled';

export type SuccessBannerProps = InferProps<typeof SuccessBannerPropTypes>;

const SuccessBanner = ({ message }: SuccessBannerProps) => (
  <SuccessMessage>
    <CheckIcon />
    <p>{message}</p>
  </SuccessMessage>
);

const SuccessBannerPropTypes = {
  message: PropTypes.string.isRequired
};

SuccessBanner.propTypes = SuccessBannerPropTypes;

export default SuccessBanner;
