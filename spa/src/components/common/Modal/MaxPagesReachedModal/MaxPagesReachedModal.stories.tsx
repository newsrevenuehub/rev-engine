import { ComponentMeta, ComponentStory } from '@storybook/react';
import MaxPagesReachedModal from './MaxPagesReachedModal';

export default {
  component: MaxPagesReachedModal,
  title: 'Pages/MaxPagesReachedModal'
} as ComponentMeta<typeof MaxPagesReachedModal>;

const Template: ComponentStory<typeof MaxPagesReachedModal> = (props) => <MaxPagesReachedModal {...props} />;

export const FreeToCore = Template.bind({});
FreeToCore.args = { currentPlan: 'FREE', recommendedPlan: 'CORE', open: true };

export const CoreToPlus = Template.bind({});
CoreToPlus.args = { currentPlan: 'CORE', recommendedPlan: 'PLUS', open: true };
