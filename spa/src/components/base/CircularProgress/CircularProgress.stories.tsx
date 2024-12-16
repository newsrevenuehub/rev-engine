import { Meta, StoryFn } from '@storybook/react';
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
} as Meta<typeof CircularProgress>;

const Template: StoryFn<typeof CircularProgress> = (props) => <CircularProgress {...props} />;

export const Indeterminate = Template.bind({});

Indeterminate.args = {
  variant: 'indeterminate'
};

export const Determinate = Template.bind({});

Determinate.args = {
  variant: 'determinate',
  value: 75
};
