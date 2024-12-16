import { Meta, StoryFn } from '@storybook/react';
import AmountItem from './AmountItem';

export default {
  component: AmountItem,
  title: 'ElementEditors/AmountItem'
} as Meta<typeof AmountItem>;

const Template: StoryFn<typeof AmountItem> = (props) => <AmountItem {...props} />;

export const Normal = Template.bind({});
Normal.args = {
  amount: 123.45
};

export const Default = Template.bind({});
Default.args = {
  amount: 123.45,
  isDefault: true,
  removable: true
};

export const ReallyLong = Template.bind({});
ReallyLong.args = {
  amount: 123567890,
  removable: true
};

export const Unremovable = Template.bind({});
Unremovable.args = {
  amount: 123.45,
  removable: false
};
