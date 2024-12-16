import { Meta, StoryFn } from '@storybook/react';
import ContributionDisclaimer from './ContributionDisclaimer';

export default {
  component: ContributionDisclaimer,
  title: 'Donation Page/ContributionDisclaimer'
} as Meta<typeof ContributionDisclaimer>;

const Template: StoryFn<typeof ContributionDisclaimer> = (props) => <ContributionDisclaimer {...props} />;

export const OneTime = Template.bind({});
OneTime.args = {
  formattedAmount: '$123.45 USD',
  interval: 'one_time',
  processingDate: new Date('March 10, 2021 10:00:00')
};

export const Monthly = Template.bind({});
Monthly.args = {
  formattedAmount: '$123.45 USD',
  interval: 'month',
  processingDate: new Date('March 10, 2021 10:00:00')
};

export const Yearly = Template.bind({});
Yearly.args = {
  formattedAmount: '$123.45 USD',
  interval: 'year',
  processingDate: new Date('March 10, 2021 10:00:00')
};
