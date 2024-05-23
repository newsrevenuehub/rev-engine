import { Meta, StoryFn } from '@storybook/react';
import ContactInfoPopover from './ContactInfoPopover';

export default {
  component: ContactInfoPopover,
  title: 'Contributor/ContactInfoPopover'
} as Meta<typeof ContactInfoPopover>;

const Template: StoryFn<typeof ContactInfoPopover> = (props) => (
  <div style={{ marginTop: 250, marginLeft: 400 }}>
    <ContactInfoPopover {...props}>This is the popover content.</ContactInfoPopover>
  </div>
);

export const Default = Template.bind({});
Default.args = {
  revenueProgram: {
    contact_email: 'revengine@news.com',
    contact_phone: '+1 (415) 555-2671'
  } as any
};

export const OnlyEmail = Template.bind({});
OnlyEmail.args = {
  revenueProgram: {
    contact_email: 'revengine@news.com',
    contact_phone: ''
  } as any
};

export const OnlyPhone = Template.bind({});
OnlyPhone.args = {
  revenueProgram: {
    contact_email: '',
    contact_phone: '+1 (415) 555-2671'
  } as any
};
