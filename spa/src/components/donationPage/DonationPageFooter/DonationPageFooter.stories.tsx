import { ComponentMeta, ComponentStory } from '@storybook/react';
import DonationPageFooter from './DonationPageFooter';

export default {
  component: DonationPageFooter,
  title: 'Donation Page/DonationPageFooter'
} as ComponentMeta<typeof DonationPageFooter>;

const Template: ComponentStory<typeof DonationPageFooter> = (props) => <DonationPageFooter {...props} />;

export const Default = Template.bind({});

export const WithPage = Template.bind({});
WithPage.args = {
  page: { revenue_program: { name: 'Revenue Program Name' } } as any
};
