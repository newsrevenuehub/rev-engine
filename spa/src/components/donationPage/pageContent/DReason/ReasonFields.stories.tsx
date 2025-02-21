import { Meta, StoryObj } from '@storybook/react';
import ReasonFields from './ReasonFields';

const meta: Meta<typeof ReasonFields> = {
  component: ReasonFields,
  title: 'Donation Page/ReasonFields'
};

export default meta;

type Story = StoryObj<typeof ReasonFields>;

export const Default: Story = {};
Default.args = {
  options: ['Reason 1', 'Reason 2'],
  text: ''
};

export const DefaultError: Story = {};
DefaultError.args = {
  error: 'Error message',
  options: ['Reason 1', 'Reason 2'],
  required: true,
  text: ''
};

export const DefaultRequired: Story = {};
DefaultRequired.args = {
  options: ['Reason 1', 'Reason 2'],
  required: true,
  text: ''
};

export const OtherVisible: Story = {};
OtherVisible.args = {
  options: ['Reason 1', 'Reason 2'],
  selectedOption: 'Other',
  text: 'User-entered reason'
};

export const OtherVisibleError: Story = {};
OtherVisibleError.args = {
  error: 'Error message',
  options: ['Reason 1', 'Reason 2'],
  selectedOption: 'Other',
  text: 'User-entered reason'
};

export const OtherVisibleRequired: Story = {};
OtherVisibleRequired.args = {
  options: ['Reason 1', 'Reason 2'],
  required: true,
  selectedOption: 'Other',
  text: 'User-entered reason'
};

export const TextOnly: Story = {};
TextOnly.args = {
  options: [],
  text: 'User-entered reason'
};

export const TextOnlyError: Story = {};
TextOnlyError.args = {
  error: 'Error message',
  options: [],
  text: 'User-entered reason'
};

export const TextOnlyRequired: Story = {};
TextOnlyRequired.args = {
  options: [],
  required: true,
  text: 'User-entered reason'
};
