import { ManageSubscriptionProps } from '../ManageSubscription';

export const ManageSubscription = ({ organization }: ManageSubscriptionProps) => (
  <div data-testid="mock-manage-subscription" data-organization-id={organization.id} />
);

export default ManageSubscription;
