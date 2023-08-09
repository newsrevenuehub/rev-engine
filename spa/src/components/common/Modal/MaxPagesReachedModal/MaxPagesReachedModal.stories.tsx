import { ComponentMeta, ComponentStory } from '@storybook/react';
import { PLAN_NAMES } from 'constants/orgPlanConstants';
import MaxPagesReachedModal from './MaxPagesReachedModal';

export default {
  component: MaxPagesReachedModal,
  title: 'Pages/MaxPagesReachedModal'
} as ComponentMeta<typeof MaxPagesReachedModal>;

const Template: ComponentStory<typeof MaxPagesReachedModal> = (props) => <MaxPagesReachedModal {...props} />;

export const FreeToCore = Template.bind({});
FreeToCore.args = { currentPlan: PLAN_NAMES.FREE, recommendedPlan: 'CORE', open: true };

export const CoreToPlus = Template.bind({});
CoreToPlus.args = { currentPlan: PLAN_NAMES.CORE, recommendedPlan: 'PLUS', open: true };
