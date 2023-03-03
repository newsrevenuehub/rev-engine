import { ComponentMeta, ComponentStory } from '@storybook/react';
import MaxPagesReachedModal from './MaxPagesReachedModal';

export default {
  component: MaxPagesReachedModal,
  title: 'Pages/MaxPagesReachedModal'
} as ComponentMeta<typeof MaxPagesReachedModal>;

const Template: ComponentStory<typeof MaxPagesReachedModal> = (props) => <MaxPagesReachedModal {...props} />;

export const Default = Template.bind({});
Default.args = { open: true };
