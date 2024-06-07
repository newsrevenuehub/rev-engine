import { Meta, StoryFn } from '@storybook/react';
import DesktopContactInfoPopover from './DesktopContactInfoPopover';

export default {
  component: DesktopContactInfoPopover,
  title: 'Contributor/DesktopContactInfoPopover'
} as Meta<typeof DesktopContactInfoPopover>;

const Template: StoryFn<typeof DesktopContactInfoPopover> = (props) => (
  <div style={{ marginTop: 250, marginLeft: 400 }}>
    <DesktopContactInfoPopover {...props}>This is the popover content.</DesktopContactInfoPopover>
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
