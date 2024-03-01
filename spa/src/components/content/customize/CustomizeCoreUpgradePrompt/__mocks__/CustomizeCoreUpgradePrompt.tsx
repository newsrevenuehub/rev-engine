import { CustomizeCoreUpgradePromptProps } from '../CustomizeCoreUpgradePrompt';

export const CustomizeCoreUpgradePrompt = ({ onClose }: CustomizeCoreUpgradePromptProps) => (
  <div data-testid="mock-customize-core-upgrade-prompt">
    <button onClick={onClose}>customize-on-close</button>
  </div>
);

export default CustomizeCoreUpgradePrompt;
