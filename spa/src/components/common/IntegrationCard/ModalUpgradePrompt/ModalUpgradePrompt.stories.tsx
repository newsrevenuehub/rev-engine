import { ComponentMeta, ComponentStory } from '@storybook/react';
import ModalUpgradePrompt from './ModalUpgradePrompt';

export default {
  component: ModalUpgradePrompt,
  title: 'Common/ModalUpgradePrompt'
} as ComponentMeta<typeof ModalUpgradePrompt>;

const Template: ComponentStory<typeof ModalUpgradePrompt> = (props) => <ModalUpgradePrompt {...props} />;

export const Default = Template.bind({});
