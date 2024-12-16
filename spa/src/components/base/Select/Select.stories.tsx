import { Meta, StoryFn } from '@storybook/react';
import Select from './Select';

export default {
  title: 'Base/Select/Select',
  component: Select
} as Meta<typeof Select>;

const Template: StoryFn<typeof Select> = (args: any) => <Select {...args} />;

export const Default = Template.bind({});
Default.args = {
  value: 'date',
  options: [
    {
      label: (
        <p style={{ margin: 0 }}>
          Date <i>(most recent)</i>
        </p>
      ),
      selectedLabel: 'Date',
      value: 'date'
    },
    { label: 'Status', value: 'status' },
    {
      label: (
        <p style={{ margin: 0 }}>
          Amount <em>(high to low)</em>
        </p>
      ),
      selectedLabel: 'Amount',
      value: 'amount'
    }
  ]
};
