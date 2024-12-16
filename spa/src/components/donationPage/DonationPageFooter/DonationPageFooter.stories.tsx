import { Meta, StoryFn } from '@storybook/react';
import DonationPageFooter from './DonationPageFooter';

export default {
  component: DonationPageFooter,
  title: 'Donation Page/DonationPageFooter'
} as Meta<typeof DonationPageFooter>;

const Template: StoryFn<typeof DonationPageFooter> = (props) => <DonationPageFooter {...props} />;

export const Default = Template.bind({});

export const WithPage = Template.bind({});
WithPage.args = {
  page: { revenue_program: { name: 'Revenue Program Name' } } as any
};
