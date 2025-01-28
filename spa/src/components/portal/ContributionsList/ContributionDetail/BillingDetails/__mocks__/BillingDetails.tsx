import { BillingDetailsProps } from '..';

export const BillingDetails = ({
  contribution,
  disabled,
  enableEditMode,
  editable,
  onEdit,
  onEditComplete,
  onUpdateAmount
}: BillingDetailsProps) => (
  <div
    data-testid="mock-billing-details"
    data-contribution={contribution.id}
    data-disabled={disabled}
    data-editable={editable}
    data-enableeditmode={enableEditMode}
  >
    <button onClick={onEdit}>onEditBillingDetails</button>
    <button onClick={onEditComplete}>onEditCompleteBillingDetails</button>
    <button onClick={() => onUpdateAmount({ amount: 12345, donor_selected_amount: 123.45, interval: 'year' })}>
      onUpdateAmount
    </button>
  </div>
);
export default BillingDetails;
