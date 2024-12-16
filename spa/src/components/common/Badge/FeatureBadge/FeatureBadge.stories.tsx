import { Meta, StoryFn } from '@storybook/react';
import FeatureBadge from './FeatureBadge';

export default {
  component: FeatureBadge,
  title: 'Common/Badge/FeatureBadge',
  args: {
    type: 'CORE'
  },
  argTypes: {
    color: {
      control: { type: 'select' },
      options: ['CORE', 'CUSTOM']
    }
  }
} as Meta<typeof FeatureBadge>;

const Template: StoryFn<typeof FeatureBadge> = (props) => (
  <div style={{ display: 'flex', gap: '16px' }}>
    <FeatureBadge {...props} />
    <FeatureBadge type="CUSTOM" />
  </div>
);

export const Default = Template.bind({});
