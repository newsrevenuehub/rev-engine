import AddPageModal from './AddPageModal';
import { ComponentMeta, ComponentStory } from '@storybook/react';

export default {
  title: 'Common/Modal/AddPageModal',
  component: AddPageModal,
  argTypes: {
    published_date: {
      type: 'string'
    }
  }
} as ComponentMeta<typeof AddPageModal>;

export const Default: ComponentStory<typeof AddPageModal> = (args) => <AddPageModal {...args} />;

Default.args = {
  open: true,
  revenuePrograms: [
    { id: 1, name: 'RP 1' },
    { id: 3, name: 'RP 3' },
    { id: 2, name: 'RP 2' }
  ]
};
