import { Meta, StoryFn } from '@storybook/react';
import ConnectStripeModal from './ConnectStripeModal';

export default {
  component: ConnectStripeModal,
  title: 'Dashboard/ConnectStripeModal'
} as Meta<typeof ConnectStripeModal>;

const Template: StoryFn<typeof ConnectStripeModal> = (props) => <ConnectStripeModal {...props} />;

export const Default = Template.bind({});
Default.args = { open: true };
