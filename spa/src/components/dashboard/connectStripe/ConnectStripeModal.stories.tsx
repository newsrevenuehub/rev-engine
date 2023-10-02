import { ComponentMeta, ComponentStory } from '@storybook/react';
import ConnectStripeModal from './ConnectStripeModal';

export default {
  component: ConnectStripeModal,
  title: 'Dashboard/ConnectStripeModal'
} as ComponentMeta<typeof ConnectStripeModal>;

const Template: ComponentStory<typeof ConnectStripeModal> = (props) => <ConnectStripeModal {...props} />;

export const Default = Template.bind({});
Default.args = { open: true };
