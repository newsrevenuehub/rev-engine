import { Meta, StoryFn } from '@storybook/react';
import OffscreenText from './OffscreenText';

export default {
  component: OffscreenText,
  title: 'Base/OffscreenText'
} as Meta<typeof OffscreenText>;

const Template: StoryFn<typeof OffscreenText> = (props) => <OffscreenText {...props} />;

export const Default = Template.bind({});

Default.args = { children: 'This text is only perceivable by assistive technology.' };
