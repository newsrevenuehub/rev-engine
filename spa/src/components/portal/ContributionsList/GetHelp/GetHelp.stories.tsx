import { Meta, StoryFn } from '@storybook/react';
import GetHelp from './GetHelp';

export default {
  component: GetHelp,
  title: 'Contributor/GetHelp'
} as Meta<typeof GetHelp>;

const Template: StoryFn<typeof GetHelp> = (props) => <GetHelp {...props} />;

export const Default = Template.bind({});
Default.args = {
  contact_email: 'revengine@news.com',
  contact_phone: '+1 (415) 555-2671'
};

export const OnlyEmail = Template.bind({});
OnlyEmail.args = {
  contact_email: 'revengine@news.com',
  contact_phone: ''
};

export const OnlyPhone = Template.bind({});
OnlyPhone.args = {
  contact_email: '',
  contact_phone: '+1 (415) 555-2671'
};
