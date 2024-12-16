import { Meta, StoryFn } from '@storybook/react';
import SidebarUpgradePrompt from './SidebarUpgradePrompt';

export default {
  component: SidebarUpgradePrompt,
  title: 'Sidebar/SidebarUpgradePrompt'
} as Meta<typeof SidebarUpgradePrompt>;

const Template: StoryFn<typeof SidebarUpgradePrompt> = (props) => (
  <div style={{ width: 330, gap: 10, display: 'flex', flexDirection: 'column' }}>
    <SidebarUpgradePrompt {...props} currentPlan="FREE" />
    <SidebarUpgradePrompt {...props} currentPlan="CORE" />
    <SidebarUpgradePrompt {...props} currentPlan="PLUS" />
  </div>
);

export const Default = Template.bind({});
