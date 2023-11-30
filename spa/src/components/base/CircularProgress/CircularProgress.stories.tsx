import { ComponentMeta, ComponentStory } from '@storybook/react';
import CircularProgress from './CircularProgress';

export default {
  component: CircularProgress,
  title: 'Base/CircularProgress',
  parameters: {
    docs: {
      description: {
        component:
          'A MUI-based progress indicator. See [the API](https://v4.mui.com/api/circular-progress/) for more details.'
      }
    }
  }
} as ComponentMeta<typeof CircularProgress>;

const Template: ComponentStory<typeof CircularProgress> = (props) => <CircularProgress {...props} />;

export const Indeterminate = Template.bind({});

Indeterminate.args = {
  variant: 'indeterminate'
};

export const Determinate = Template.bind({});

Determinate.args = {
  variant: 'determinate',
  value: 75
};
