import { Meta, StoryObj } from '@storybook/react';
import PaymentMethod from './PaymentMethod';
import { formattedCardBrands } from 'constants/creditCard';

const PaymentMethodDemo = (contribution: any) => <PaymentMethod contribution={contribution} editable={false} />;

const meta: Meta<typeof PaymentMethodDemo> = {
  argTypes: {
    card_brand: {
      options: Object.keys(formattedCardBrands),
      control: { type: 'select' }
    }
  },
  component: PaymentMethodDemo,
  title: 'Contributor/PaymentMethod'
};

export default meta;

type Story = StoryObj<typeof PaymentMethodDemo>;

export const Default: Story = {};
Default.args = {
  card_brand: 'visa',
  credit_card_expiration_date: '1/2001',
  credit_card_owner_name: 'Jane Doe',
  interval: 'one_time'
};
