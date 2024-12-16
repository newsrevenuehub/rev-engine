import { Meta, StoryFn } from '@storybook/react';

import BackButton from './BackButton';

export default {
  title: 'Common/Button/BackButton',
  component: BackButton
} as Meta<typeof BackButton>;

export const Default: StoryFn<typeof BackButton> = (args) => <BackButton {...args} />;
Default.args = {};
