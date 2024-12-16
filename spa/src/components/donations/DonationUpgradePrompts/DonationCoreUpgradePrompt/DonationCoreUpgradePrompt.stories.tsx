import { Meta, StoryFn } from '@storybook/react';
import DonationCoreUpgradePrompt from './DonationCoreUpgradePrompt';

export default {
  component: DonationCoreUpgradePrompt,
  title: 'Donations/DonationCoreUpgradePrompt'
} as Meta<typeof DonationCoreUpgradePrompt>;

const Template: StoryFn<typeof DonationCoreUpgradePrompt> = (props) => <DonationCoreUpgradePrompt {...props} />;

export const Default = Template.bind({});
