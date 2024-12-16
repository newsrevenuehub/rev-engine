import { Meta, StoryFn } from '@storybook/react';

import ButtonBorderPreview from './ButtonBorderPreview';

export default {
  title: 'Common/ButtonBorderPreview',
  component: ButtonBorderPreview
} as Meta<typeof ButtonBorderPreview>;

export const Default: StoryFn<typeof ButtonBorderPreview> = (args) => <ButtonBorderPreview {...args} />;

Default.args = {
  borderRadius: 12
};
