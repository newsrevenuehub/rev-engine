import { Meta, StoryFn } from '@storybook/react';
import AmountEditor from './AmountEditor';

export default {
  component: AmountEditor,
  title: 'ElementEditors/AmountEditor'
} as Meta<typeof AmountEditor>;

const Template: StoryFn<typeof AmountEditor> = (props) => <AmountEditor {...props} />;

export const Default = Template.bind({});
Default.args = {
  contributionIntervals: [{ interval: 'one_time' }, { interval: 'month' }, { interval: 'year' }],
  elementContent: {
    defaults: {
      one_time: 123.45,
      month: 3,
      year: 100
    },
    options: {
      one_time: [123.45, 67890],
      month: [1, 2, 3],
      year: [100, 200, 300]
    }
  }
};
