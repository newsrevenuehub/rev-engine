import StepperDots from './StepperDots';

const StepperDotsDemo = (props) => <StepperDots {...props} />;

export default {
  title: 'Base/StepperDots',
  component: StepperDots
};

export const Default = StepperDotsDemo.bind({});
Default.args = {
  activeStep: 0,
  steps: 5
};
