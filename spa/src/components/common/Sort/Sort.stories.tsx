import { Meta, StoryFn } from '@storybook/react';
import Sort from './Sort';

export default {
  title: 'Common/Sort',
  component: Sort
} as Meta<typeof Sort>;

export const Default: StoryFn<typeof Sort> = Sort.bind({});

Default.args = {
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
