import { ComponentMeta, ComponentStory } from '@storybook/react';
import PublishedPageLocaleChangeModal from './PublishedPageLocaleChangeModal';

export default {
  component: PublishedPageLocaleChangeModal,
  title: 'Common/Modal/PublishedPageLocaleChangeModal'
} as ComponentMeta<typeof PublishedPageLocaleChangeModal>;

const Template: ComponentStory<typeof PublishedPageLocaleChangeModal> = (props) => (
  <PublishedPageLocaleChangeModal {...props} />
);

export const Default = Template.bind({});

Default.args = { open: true };
