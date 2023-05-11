import { ComponentMeta, ComponentStory } from '@storybook/react';
import EnginePlanBadge from './EnginePlanBadge';

export default {
  component: EnginePlanBadge,
  title: 'Common/Badge/EnginePlanBadge',
  argTypes: {
    plan: {
      control: { type: 'select' },
      defaultValue: 'FREE',
      options: ['FREE', 'CORE', 'PLUS']
    }
  }
} as ComponentMeta<typeof EnginePlanBadge>;

const Template: ComponentStory<typeof EnginePlanBadge> = (props) => <EnginePlanBadge {...props} />;

export const Default = Template.bind({});
