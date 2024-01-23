import { Meta, StoryObj } from '@storybook/react';
import MobileHeader from './MobileHeader';

const MobileHeaderDemo = (contribution: any) => <MobileHeader contribution={contribution} />;

const meta: Meta<typeof MobileHeaderDemo> = {
  component: MobileHeaderDemo,
  title: 'Contributor/MobileHeader'
};

export default meta;

type Story = StoryObj<typeof MobileHeaderDemo>;

export const Default: Story = {};
Default.args = {
  amount: 12345,
  created: new Date('1/1/2001').toISOString(),
  next_payment_date: new Date('2/1/2001').toISOString()
};

export const NoNextPayment: Story = {};
NoNextPayment.args = {
  amount: 12345,
  created: new Date('1/1/2001').toISOString()
};
