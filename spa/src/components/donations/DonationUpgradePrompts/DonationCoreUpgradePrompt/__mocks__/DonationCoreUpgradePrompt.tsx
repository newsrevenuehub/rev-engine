import { DonationCoreUpgradePromptProps } from '../DonationCoreUpgradePrompt';

export const DonationCoreUpgradePrompt = ({ onClose }: DonationCoreUpgradePromptProps) => (
  <div data-testid="mock-donation-core-upgrade-prompt">
    <button onClick={onClose}>onClose</button>
  </div>
);

export default DonationCoreUpgradePrompt;
