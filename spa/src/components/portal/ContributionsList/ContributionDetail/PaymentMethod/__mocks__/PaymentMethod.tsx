import { PaymentMethodProps } from '..';

export const PaymentMethod = ({
  contribution,
  disabled,
  editable,
  onEdit,
  onEditComplete,
  onUpdatePaymentMethod
}: PaymentMethodProps) => (
  <div
    data-testid="mock-payment-method"
    data-contribution={contribution.id}
    data-disabled={!!disabled}
    data-editable={editable}
  >
    <button onClick={onEdit}>onEdit</button>
    <button onClick={onEditComplete}>onEditComplete</button>
    <button onClick={() => onUpdatePaymentMethod({ id: 'mock-payment-method-id' } as any)}>
      onUpdatePaymentMethod
    </button>
  </div>
);
export default PaymentMethod;
