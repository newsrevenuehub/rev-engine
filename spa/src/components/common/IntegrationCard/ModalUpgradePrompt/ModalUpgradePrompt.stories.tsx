import { Meta, StoryFn } from '@storybook/react';
import ModalUpgradePrompt from './ModalUpgradePrompt';

export default {
  component: ModalUpgradePrompt,
  title: 'Common/IntegrationCard/ModalUpgradePrompt'
} as Meta<typeof ModalUpgradePrompt>;

const Template: StoryFn<typeof ModalUpgradePrompt> = (props) => <ModalUpgradePrompt {...props} />;

export const Default = Template.bind({});

Default.args = {
  text: 'This is a default ModalUpgradePrompt component'
};
