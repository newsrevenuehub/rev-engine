import { ComponentMeta, ComponentStory } from '@storybook/react';
import OffscreenText from './OffscreenText';

export default {
  component: OffscreenText,
  title: 'Base/OffscreenText'
} as ComponentMeta<typeof OffscreenText>;

const Template: ComponentStory<typeof OffscreenText> = (props) => <OffscreenText {...props} />;

export const Default = Template.bind({});

Default.args = { children: 'This text is only perceivable by assistive technology.' };
