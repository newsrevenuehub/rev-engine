import { Meta, StoryFn } from '@storybook/react';
import SuccessBanner from './SuccessBanner';

export default {
  component: SuccessBanner,
  title: 'common/SuccessBanner'
} as Meta<typeof SuccessBanner>;

const Template: StoryFn<typeof SuccessBanner> = (props) => <SuccessBanner {...props} />;

export const Success = Template.bind({});
Success.args = {
  show: true,
  message: 'Success Message!'
};
