import { Meta, StoryFn } from '@storybook/react';
import AmountInterval from './AmountInterval';

export default {
  component: AmountInterval,
  title: 'ElementEditors/AmountInterval',
  argTypes: {
    interval: { control: 'select', options: ['one_time', 'month', 'year'] }
  }
} as Meta<typeof AmountInterval>;

const Template: StoryFn<typeof AmountInterval> = (props) => <AmountInterval {...props} />;

export const WithDefault = Template.bind({});
WithDefault.args = {
  defaultOption: 123.45,
  interval: 'one_time',
  options: [123.45, 5678.9, 12345689]
};

export const UsingStrings = Template.bind({});
UsingStrings.args = {
  defaultOption: '123.45' as any,
  interval: 'one_time',
  options: ['123.45', '5678.9', '12345689'] as any
};

export const NoDefault = Template.bind({});
NoDefault.args = {
  interval: 'one_time',
  options: [123.45, 5678.9, 12345689]
};

export const OneOption = Template.bind({});
OneOption.args = {
  interval: 'one_time',
  options: [123.45]
};
