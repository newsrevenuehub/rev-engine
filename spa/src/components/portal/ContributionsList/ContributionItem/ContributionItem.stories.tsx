import { Meta, StoryObj } from '@storybook/react';
import ContributionItem from './ContributionItem';

const ContributionItemDemo = (contribution: any) => <ContributionItem contribution={contribution} />;

const meta: Meta<typeof ContributionItemDemo> = {
  component: ContributionItemDemo,
  title: 'Contributor/ContributionItem'
};

export default meta;

type Story = StoryObj<typeof ContributionItemDemo>;

export const Default: Story = {};
Default.args = {
  amount: 12345,
  card_brand: 'visa',
  first_payment_date: new Date('1/1/2001').toISOString(),
  interval: 'one_time',
  next_payment_date: new Date('2/1/2001').toISOString(),
  card_last_4: '1234',
  status: 'paid'
};
Default.argTypes = {
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
};

export const NoNextPayment: Story = {};
NoNextPayment.args = {
  ...Default.args,
  next_payment_date: null
};

export const NoPaymentDate: Story = {};
NoPaymentDate.args = {
  ...Default.args,
  first_payment_date: null
};
