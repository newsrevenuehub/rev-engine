import { Meta, StoryFn } from '@storybook/react';
import PublishedPageLocaleChangeModal from './PublishedPageLocaleChangeModal';

export default {
  component: PublishedPageLocaleChangeModal,
  title: 'Common/Modal/PublishedPageLocaleChangeModal'
} as Meta<typeof PublishedPageLocaleChangeModal>;

const Template: StoryFn<typeof PublishedPageLocaleChangeModal> = (props) => (
  <PublishedPageLocaleChangeModal {...props} />
);

export const Default = Template.bind({});

Default.args = { open: true };
