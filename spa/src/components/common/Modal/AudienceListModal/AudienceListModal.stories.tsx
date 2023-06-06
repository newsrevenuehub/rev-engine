import { ComponentMeta, ComponentStory } from '@storybook/react';
import AudienceListModal from './AudienceListModal';

export default {
  title: 'Common/Modal/AudienceListModal',
  component: AudienceListModal,
  argTypes: {
    published_date: {
      type: 'string'
    }
  }
} as ComponentMeta<typeof AudienceListModal>;

export const Default: ComponentStory<typeof AudienceListModal> = (args) => <AudienceListModal {...args} />;

Default.args = { open: true };
