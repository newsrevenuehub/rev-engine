import { ComponentMeta, ComponentStory } from '@storybook/react';
import AmountEditor from './AmountEditor';

export default {
  component: AmountEditor,
  title: 'ElementEditors/AmountEditor'
} as ComponentMeta<typeof AmountEditor>;

const Template: ComponentStory<typeof AmountEditor> = (props) => <AmountEditor {...props} />;

export const Default = Template.bind({});
Default.args = {
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
  },
  pagePreview: {
    elements: [
      {
        type: 'DFrequency',
        content: [
          { displayName: 'One Time', value: 'one_time' },
          { displayName: 'Monthly', value: 'month' },
          { displayName: 'Yearly', value: 'year' }
        ]
      }
    ]
  } as any
};
