import { ComponentMeta, ComponentStory } from '@storybook/react';
import SidebarCoreUpgradePrompt from './SidebarCoreUpgradePrompt';

export default {
  component: SidebarCoreUpgradePrompt,
  title: 'Sidebar/SidebarCoreUpgradePrompt'
} as ComponentMeta<typeof SidebarCoreUpgradePrompt>;

const Template: ComponentStory<typeof SidebarCoreUpgradePrompt> = (props) => (
  <div style={{ width: 330 }}>
    <SidebarCoreUpgradePrompt {...props} />
  </div>
);

export const Default = Template.bind({});
