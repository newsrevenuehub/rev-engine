import { ComponentMeta, ComponentStory } from '@storybook/react';
import ContributionDisclaimer from './ContributionDisclaimer';

export default {
  component: ContributionDisclaimer,
  title: 'Donation Page/ContributionDisclaimer',
  parameters: {
    date: new Date('March 10, 2021 10:00:00')
  }
} as ComponentMeta<typeof ContributionDisclaimer>;

const Template: ComponentStory<typeof ContributionDisclaimer> = (props) => <ContributionDisclaimer {...props} />;

export const OneTime = Template.bind({});
OneTime.args = {
  formattedAmount: '$123.45 USD',
  interval: 'one_time'
};

export const Monthly = Template.bind({});
Monthly.args = {
  formattedAmount: '$123.45 USD',
  interval: 'month'
};

export const Yearly = Template.bind({});
Yearly.args = {
  formattedAmount: '$123.45 USD',
  interval: 'year'
};
