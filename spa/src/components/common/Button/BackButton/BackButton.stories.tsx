import { ComponentMeta, ComponentStory } from '@storybook/react';

import BackButton from './BackButton';

export default {
  title: 'Common/Button/BackButton',
  component: BackButton
} as ComponentMeta<typeof BackButton>;

export const Default: ComponentStory<typeof BackButton> = (args) => <BackButton {...args} />;
Default.args = {};
