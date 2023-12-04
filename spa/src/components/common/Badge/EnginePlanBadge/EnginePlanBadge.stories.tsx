import { ComponentMeta, ComponentStory } from '@storybook/react';
import EnginePlanBadge from './EnginePlanBadge';

export default {
  component: EnginePlanBadge,
  title: 'Common/Badge/EnginePlanBadge',
  args: {
    plan: 'FREE'
  },
  argTypes: {
    plan: {
      control: { type: 'select' },
      options: ['FREE', 'CORE', 'PLUS']
    }
  }
} as ComponentMeta<typeof EnginePlanBadge>;

const Template: ComponentStory<typeof EnginePlanBadge> = (props) => <EnginePlanBadge {...props} />;

export const Default = Template.bind({});
