import { ComponentMeta, ComponentStory } from '@storybook/react';
import CustomizeCoreUpgradePrompt from './CustomizeCoreUpgradePrompt';

export default {
  component: CustomizeCoreUpgradePrompt,
  title: 'Customize/CustomizeCoreUpgradePrompt'
} as ComponentMeta<typeof CustomizeCoreUpgradePrompt>;

const Template: ComponentStory<typeof CustomizeCoreUpgradePrompt> = (props) => (
  <CustomizeCoreUpgradePrompt {...props} />
);

export const Default = Template.bind({});
Default.args = {};
