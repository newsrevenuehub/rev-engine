import { UpgradePlanProps } from '../UpgradePlan';

export const UpgradePlan = ({ organization, user }: UpgradePlanProps) => (
  <div data-testid="mock-upgrade-plan" data-organization-id={organization.id} data-user-id={user.id} />
);

export default UpgradePlan;
