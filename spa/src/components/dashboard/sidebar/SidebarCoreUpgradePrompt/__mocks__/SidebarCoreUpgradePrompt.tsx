import { SidebarCoreUpgradePromptProps } from '../SidebarCoreUpgradePrompt';

export const SidebarCoreUpgradePrompt = ({ onClose }: SidebarCoreUpgradePromptProps) => (
  <div data-testid="mock-sidebar-core-upgrade-prompt">
    <button onClick={onClose}>onClose</button>
  </div>
);

export default SidebarCoreUpgradePrompt;
