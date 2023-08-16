import { CustomizeCoreUpgradePromptProps } from '../CustomizeCoreUpgradePrompt';

export const CustomizeCoreUpgradePrompt = ({ onClose, user }: CustomizeCoreUpgradePromptProps) => (
  <div data-testid="mock-customize-core-upgrade-prompt" data-user={JSON.stringify(user)}>
    <button onClick={onClose}>customize-on-close</button>
  </div>
);

export default CustomizeCoreUpgradePrompt;
