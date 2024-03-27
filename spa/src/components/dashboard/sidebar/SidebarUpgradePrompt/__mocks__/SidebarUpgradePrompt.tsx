import { SidebarUpgradePromptProps } from '../SidebarUpgradePrompt';

export const SidebarUpgradePrompt = ({ onClose, currentPlan }: SidebarUpgradePromptProps) => (
  <div data-testid="mock-sidebar-upgrade-prompt" data-currentPlan={currentPlan}>
    <button onClick={onClose}>onClose</button>
  </div>
);

export default SidebarUpgradePrompt;
