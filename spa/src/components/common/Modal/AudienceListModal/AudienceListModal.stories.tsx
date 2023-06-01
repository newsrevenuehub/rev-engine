import { ComponentMeta, ComponentStory } from '@storybook/react';
import { RevenueProgram } from 'hooks/useContributionPage';
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

Default.args = {
  open: true,
  revenueProgram: {
    id: 0,
    mailchimp_email_lists: [
      { id: '1', name: 'Audience 1' },
      { id: '3', name: 'Audience 3' },
      { id: '2', name: 'Audience 2' }
    ]
  } as RevenueProgram
};
