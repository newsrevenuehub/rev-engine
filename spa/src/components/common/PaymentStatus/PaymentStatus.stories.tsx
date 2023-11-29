import { ComponentMeta, ComponentStory } from '@storybook/react';
import PaymentStatus from './PaymentStatus';

export default {
  args: {
    status: 'paid'
  },
  argTypes: {
    status: {
      control: 'select',
      options: ['canceled', 'failed', 'flagged', 'paid', 'processing', 'rejected']
    }
  },
  component: PaymentStatus,
  title: 'Common/PaymentStatus'
} as ComponentMeta<typeof PaymentStatus>;

const Template: ComponentStory<typeof PaymentStatus> = (props) => <PaymentStatus {...props} />;

export const Default = Template.bind({});
Default.args = {
  status: 'paid'
};
