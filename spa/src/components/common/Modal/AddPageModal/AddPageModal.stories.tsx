import AddPageModal from './AddPageModal';
import { Meta, StoryFn } from '@storybook/react';

export default {
  title: 'Common/Modal/AddPageModal',
  component: AddPageModal,
  argTypes: {
    published_date: {
      type: 'string'
    }
  }
} as Meta<typeof AddPageModal>;

export const Default: StoryFn<typeof AddPageModal> = (args) => <AddPageModal {...args} />;

Default.args = {
  open: true,
  revenuePrograms: [
    { id: 1, name: 'RP 1' },
    { id: 3, name: 'RP 3' },
    { id: 2, name: 'RP 2' }
  ]
};
