import { ComponentMeta, ComponentStory } from '@storybook/react';

import ButtonBorderPreview from './ButtonBorderPreview';

export default {
  title: 'Common/ButtonBorderPreview',
  component: ButtonBorderPreview
} as ComponentMeta<typeof ButtonBorderPreview>;

export const Default: ComponentStory<typeof ButtonBorderPreview> = (args) => <ButtonBorderPreview {...args} />;

Default.args = {
  borderRadius: 12
};
