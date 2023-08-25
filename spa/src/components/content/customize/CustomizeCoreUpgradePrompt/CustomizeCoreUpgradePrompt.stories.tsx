import { ComponentMeta, ComponentStory } from '@storybook/react';
import CustomizeCoreUpgradePrompt from './CustomizeCoreUpgradePrompt';
import { SELF_UPGRADE_ACCESS_FLAG_NAME } from 'constants/featureFlagConstants';

export default {
  component: CustomizeCoreUpgradePrompt,
  title: 'Customize/CustomizeCoreUpgradePrompt'
} as ComponentMeta<typeof CustomizeCoreUpgradePrompt>;

const Template: ComponentStory<typeof CustomizeCoreUpgradePrompt> = (props) => (
  <CustomizeCoreUpgradePrompt {...props} />
);

export const Default = Template.bind({});
Default.args = {
  user: { flags: [] } as any
};

export const WithSelfUpgradeFlag = Template.bind({});
WithSelfUpgradeFlag.args = {
  user: { flags: [{ name: SELF_UPGRADE_ACCESS_FLAG_NAME }] } as any
};
