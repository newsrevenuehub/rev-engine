import { ComponentMeta, ComponentStory } from '@storybook/react';
import MaxPagesPublishedModal from './MaxPagesPublishedModal';

export default {
  component: MaxPagesPublishedModal,
  title: 'Pages/MaxPagesPublishedModal'
} as ComponentMeta<typeof MaxPagesPublishedModal>;

const Template: ComponentStory<typeof MaxPagesPublishedModal> = (props) => <MaxPagesPublishedModal {...props} />;

export const Free = Template.bind({});
Free.args = { currentPlan: 'FREE', open: true };

export const Core = Template.bind({});
Core.args = { currentPlan: 'CORE', open: true };
