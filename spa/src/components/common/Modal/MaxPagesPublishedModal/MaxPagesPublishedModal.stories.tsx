import { Meta, StoryFn } from '@storybook/react';
import { PLAN_NAMES } from 'constants/orgPlanConstants';
import MaxPagesPublishedModal from './MaxPagesPublishedModal';

export default {
  component: MaxPagesPublishedModal,
  title: 'Pages/MaxPagesPublishedModal'
} as Meta<typeof MaxPagesPublishedModal>;

const Template: StoryFn<typeof MaxPagesPublishedModal> = (props) => <MaxPagesPublishedModal {...props} />;

export const Free = Template.bind({});
Free.args = { currentPlan: PLAN_NAMES.FREE, open: true };

export const Core = Template.bind({});
Core.args = { currentPlan: PLAN_NAMES.CORE, open: true };
