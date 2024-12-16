import { Meta, StoryFn } from '@storybook/react';
import AudienceListModal from './AudienceListModal';

export default {
  title: 'Common/Modal/AudienceListModal',
  component: AudienceListModal,
  argTypes: {
    published_date: {
      type: 'string'
    }
  }
} as Meta<typeof AudienceListModal>;

export const Default: StoryFn<typeof AudienceListModal> = (args) => <AudienceListModal {...args} />;

Default.args = { open: true };
