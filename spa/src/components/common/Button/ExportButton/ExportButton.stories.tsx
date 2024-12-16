import { Meta, StoryFn } from '@storybook/react';
import ExportButton from './ExportButton';

export default {
  title: 'Common/Button/ExportButton',
  component: ExportButton,
  argTypes: {
    published_date: {
      type: 'string'
    }
  }
} as Meta<typeof ExportButton>;

export const Default: StoryFn<typeof ExportButton> = (args) => <ExportButton {...args} />;

Default.args = {
  transactions: 1234,
  email: 'mock-email@mock.com'
};
