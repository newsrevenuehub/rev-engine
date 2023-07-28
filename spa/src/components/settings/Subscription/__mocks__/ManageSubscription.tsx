import { ManageSubscriptionProps } from '../ManageSubscription';

export const ManageSubscription = ({ organization, user }: ManageSubscriptionProps) => (
  <div data-testid="mock-manage-subscription" data-organization-id={organization.id} data-user-id={user.id} />
);

export default ManageSubscription;
