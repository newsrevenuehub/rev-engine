import { ComponentMeta, ComponentStory } from '@storybook/react';
import { PLAN_LABELS } from 'constants/orgPlanConstants';
import MaxPagesPublishedModal from './MaxPagesPublishedModal';

export default {
  component: MaxPagesPublishedModal,
  title: 'Pages/MaxPagesPublishedModal'
} as ComponentMeta<typeof MaxPagesPublishedModal>;

const Template: ComponentStory<typeof MaxPagesPublishedModal> = (props) => <MaxPagesPublishedModal {...props} />;

export const Free = Template.bind({});
Free.args = { currentPlan: PLAN_LABELS.FREE, open: true };

export const Core = Template.bind({});
Core.args = { currentPlan: PLAN_LABELS.CORE, open: true };
