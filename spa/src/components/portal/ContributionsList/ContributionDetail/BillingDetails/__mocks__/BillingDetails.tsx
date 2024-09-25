import { BillingDetailsProps } from '..';

export const BillingDetails = ({
  contribution,
  disabled,
  enableEditMode,
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
    data-enableeditmode={enableEditMode}
  >
    <button onClick={onEdit}>onEditBillingDetails</button>
    <button onClick={onEditComplete}>onEditCompleteBillingDetails</button>
    <button onClick={() => onUpdateBillingDetails(999)}>onUpdateBillingDetails</button>
  </div>
);
export default BillingDetails;
