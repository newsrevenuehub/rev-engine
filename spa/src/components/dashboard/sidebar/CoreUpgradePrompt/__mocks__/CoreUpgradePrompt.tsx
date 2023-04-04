import { CoreUpgradePromptProps } from '../CoreUpgradePrompt';

export const CoreUpgradePrompt = ({ onClose }: CoreUpgradePromptProps) => (
  <div data-testid="mock-core-upgrade-prompt">
    <button onClick={onClose}>onClose</button>
  </div>
);

export default CoreUpgradePrompt;
