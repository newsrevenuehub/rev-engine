import { Meta, StoryFn } from '@storybook/react';
import SystemNotification from './SystemNotification';

export default {
  component: SystemNotification,
  title: 'common/SystemNotification'
} as Meta<typeof SystemNotification>;

const Template: StoryFn<typeof SystemNotification> = (props) => <SystemNotification {...props} />;

export const Success = Template.bind({});
Success.args = {
  type: 'success',
  header: 'Success Message!',
  message:
    'You have achieved great success. Bask in glory. Qui sit reprehenderit elit nisi mollit anim adipisicing exercitation enim consectetur dolore sunt proident nisi.'
};

export const Error = Template.bind({});
Error.args = {
  type: 'error',
  header: 'Error Message!',
  message:
    'We regret to tell you that something has gone awry. Fugiat fugiat Lorem quis ad ullamco laboris adipisicing laboris qui enim ullamco ex magna.'
};

export const Warning = Template.bind({});
Warning.args = {
  type: 'warning',
  header: 'Warning Message!',
  message: "We are warning you. Don't say you weren't warned. Enim reprehenderit qui consectetur id voluptate ipsum."
};

export const Info = Template.bind({});
Info.args = {
  type: 'info',
  header: 'Info Message!',
  message:
    'This message is for your FYI. Dolore aliquip cillum et do exercitation cillum aliqua exercitation ad ex adipisicing. '
};
