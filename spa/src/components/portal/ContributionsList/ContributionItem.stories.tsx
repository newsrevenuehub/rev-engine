import { ComponentMeta, ComponentStory } from '@storybook/react';
import ContributionItem from './ContributionItem';

const ContributionItemDemo = (contribution: any) => <ContributionItem contribution={contribution} />;

export default {
  args: {
    amount: 12345,
    card_brand: 'visa',
    interval: 'one_time',
    last4: '1234',
    status: 'paid'
  },
  argTypes: {
    amount: {
      type: 'number'
    },
    card_brand: {
      control: { type: 'select' },
      options: ['amex', 'diners', 'discover', 'jcb', 'mastercard', 'unionpay', 'unknown', 'visa']
    },
    created: {
      control: { type: 'date' }
    },
    interval: {
      control: { type: 'select' },
      options: ['one_time', 'month', 'year']
    },
    next_payment_date: {
      control: { type: 'date' }
    },
    status: {
      control: { type: 'select' },
      options: ['canceled', 'failed', 'paid', 'processing']
    }
  },
  component: ContributionItem,
  title: 'Contributor/ContributionItem'
} as ComponentMeta<typeof ContributionItemDemo>;

const Template: ComponentStory<typeof ContributionItemDemo> = (props) => <ContributionItemDemo {...props} />;

export const Default = Template.bind({});
