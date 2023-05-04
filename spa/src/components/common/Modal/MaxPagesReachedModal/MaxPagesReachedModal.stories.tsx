import { ComponentMeta, ComponentStory } from '@storybook/react';
import { PLAN_LABELS } from 'constants/orgPlanConstants';
import MaxPagesReachedModal from './MaxPagesReachedModal';

export default {
  component: MaxPagesReachedModal,
  title: 'Pages/MaxPagesReachedModal'
} as ComponentMeta<typeof MaxPagesReachedModal>;

const Template: ComponentStory<typeof MaxPagesReachedModal> = (props) => <MaxPagesReachedModal {...props} />;

export const FreeToCore = Template.bind({});
FreeToCore.args = { currentPlan: PLAN_LABELS.FREE, recommendedPlan: 'CORE', open: true };

export const CoreToPlus = Template.bind({});
CoreToPlus.args = { currentPlan: PLAN_LABELS.CORE, recommendedPlan: 'PLUS', open: true };
