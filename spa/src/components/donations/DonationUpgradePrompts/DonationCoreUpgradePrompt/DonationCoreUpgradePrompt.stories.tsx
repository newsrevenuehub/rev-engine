import { ComponentMeta, ComponentStory } from '@storybook/react';
import DonationCoreUpgradePrompt from './DonationCoreUpgradePrompt';

export default {
  component: DonationCoreUpgradePrompt,
  title: 'Donations/DonationCoreUpgradePrompt'
} as ComponentMeta<typeof DonationCoreUpgradePrompt>;

const Template: ComponentStory<typeof DonationCoreUpgradePrompt> = (props) => <DonationCoreUpgradePrompt {...props} />;

export const Default = Template.bind({});
