import { ComponentMeta, ComponentStory } from '@storybook/react';
import ExportButton from './ExportButton';

export default {
  title: 'Common/Button/ExportButton',
  component: ExportButton,
  argTypes: {
    published_date: {
      type: 'string'
    }
  }
} as ComponentMeta<typeof ExportButton>;

export const Default: ComponentStory<typeof ExportButton> = (args) => <ExportButton {...args} />;

Default.args = {
  transactions: 1234,
  email: 'mock-email@mock.com'
};
