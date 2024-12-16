import { Meta, StoryFn } from '@storybook/react';
import PlanChangePendingModal from './PlanChangePendingModal';

export default {
  component: PlanChangePendingModal,
  title: 'Common/Modal/PlanChangePendingModal'
} as Meta<typeof PlanChangePendingModal>;

const Template: StoryFn<typeof PlanChangePendingModal> = (props) => <PlanChangePendingModal {...props} />;

export const FreeToCore = Template.bind({});
FreeToCore.args = {
  futurePlan: 'CORE',
  open: true
};

export const CoreToPlus = Template.bind({});
CoreToPlus.args = {
  futurePlan: 'PLUS',
  open: true
};
