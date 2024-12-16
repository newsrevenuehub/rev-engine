import { Meta, StoryFn } from '@storybook/react';
import ComingSoon from './ComingSoon';

export default {
  component: ComingSoon,
  title: 'Customize/ComingSoon'
} as Meta<typeof ComingSoon>;

const Template: StoryFn<typeof ComingSoon> = () => <ComingSoon />;

export const Default = Template.bind({});
