import { ComponentMeta, ComponentStory } from '@storybook/react';
import { StepperDots } from './StepperDots';

export default {
  title: 'Base/StepperDots',
  component: StepperDots
} as ComponentMeta<typeof StepperDots>;

const Template: ComponentStory<typeof StepperDots> = (props) => <StepperDots {...props} />;

export const Default = Template.bind({});
Default.args = {
  activeStep: 0,
  steps: 5
};
