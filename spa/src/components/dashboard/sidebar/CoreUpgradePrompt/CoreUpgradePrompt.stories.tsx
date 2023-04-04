import { ComponentMeta, ComponentStory } from '@storybook/react';
import CoreUpgradePrompt from './CoreUpgradePrompt';

export default {
  component: CoreUpgradePrompt,
  title: 'Sidebar/CoreUpgradePrompt'
} as ComponentMeta<typeof CoreUpgradePrompt>;

const Template: ComponentStory<typeof CoreUpgradePrompt> = (props) => (
  <div style={{ width: 330 }}>
    <CoreUpgradePrompt {...props} />
  </div>
);

export const Default = Template.bind({});
