import { ComponentMeta, ComponentStory } from '@storybook/react';
import ComingSoon from './ComingSoon';

export default {
  component: ComingSoon,
  title: 'Customize/ComingSoon'
} as ComponentMeta<typeof ComingSoon>;

const Template: ComponentStory<typeof ComingSoon> = () => <ComingSoon />;

export const Default = Template.bind({});
