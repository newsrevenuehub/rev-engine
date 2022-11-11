import { PaymentStatus as PaymentStatusType } from 'constants/paymentStatus';
import PropTypes, { InferProps } from 'prop-types';
import toTitleCase from 'utilities/toTitleCase';
import { StatusText } from './PaymentStatus.styled';

const PaymentStatusPropTypes = {
  status: PropTypes.string.isRequired
};

export interface PaymentStatusProps extends InferProps<typeof PaymentStatusPropTypes> {
  status: PaymentStatusType;
}

export function PaymentStatus({ status }: PaymentStatusProps) {
  return <StatusText status={status}>{toTitleCase(status)}</StatusText>;
}

PaymentStatus.propTypes = PaymentStatusPropTypes;
export default PaymentStatus;
