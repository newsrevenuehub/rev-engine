import { Meta, StoryFn } from '@storybook/react';
import CustomizeCoreUpgradePrompt from './CustomizeCoreUpgradePrompt';

export default {
  component: CustomizeCoreUpgradePrompt,
  title: 'Customize/CustomizeCoreUpgradePrompt'
} as Meta<typeof CustomizeCoreUpgradePrompt>;

const Template: StoryFn<typeof CustomizeCoreUpgradePrompt> = (props) => <CustomizeCoreUpgradePrompt {...props} />;

export const Default = Template.bind({});
Default.args = {};
