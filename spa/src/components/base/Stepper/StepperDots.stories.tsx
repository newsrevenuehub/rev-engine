import { Meta, StoryFn } from '@storybook/react';
import { StepperDots } from './StepperDots';

export default {
  title: 'Base/StepperDots',
  component: StepperDots
} as Meta<typeof StepperDots>;

const Template: StoryFn<typeof StepperDots> = (props) => <StepperDots {...props} />;

export const Default = Template.bind({});
Default.args = {
  activeStep: 0,
  steps: 5
};
