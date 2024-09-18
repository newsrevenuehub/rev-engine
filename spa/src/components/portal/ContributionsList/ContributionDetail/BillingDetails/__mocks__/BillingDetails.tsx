import { BillingDetailsProps } from '..';

export const BillingDetails = ({
  contribution,
  disabled,
  editable,
  onEdit,
  onEditComplete,
  onUpdateBillingDetails
}: BillingDetailsProps) => (
  <div
    data-testid="mock-billing-details"
    data-contribution={contribution.id}
    data-disabled={disabled}
    data-editable={editable}
  >
    <button onClick={onEdit}>onEditBillingDetails</button>
    <button onClick={onEditComplete}>onEditCompleteBillingDetails</button>
    <button onClick={() => onUpdateBillingDetails(999)}>onUpdateBillingDetails</button>
  </div>
);
export default BillingDetails;
