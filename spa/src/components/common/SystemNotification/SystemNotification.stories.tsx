import { ComponentMeta, ComponentStory } from '@storybook/react';
import SystemNotification from './SystemNotification';

export default {
  component: SystemNotification,
  title: 'common/SystemNotification'
} as ComponentMeta<typeof SystemNotification>;

const Template: ComponentStory<typeof SystemNotification> = (props) => <SystemNotification {...props} />;

const handleClose = () => {};

export const Success = Template.bind({});
Success.args = {
  type: 'success',
  header: 'Success Message!',
  body: 'You have achieved great success. Bask in glory. Qui sit reprehenderit elit nisi mollit anim adipisicing exercitation enim consectetur dolore sunt proident nisi.',
  handleClose
};

export const Error = Template.bind({});
Error.args = {
  type: 'error',
  header: 'Error Message!',
  body: 'We regret to tell you that something has gone awry. Fugiat fugiat Lorem quis ad ullamco laboris adipisicing laboris qui enim ullamco ex magna.',
  handleClose
};

export const Warning = Template.bind({});
Warning.args = {
  type: 'warning',
  header: 'Warning Message!',
  body: "We are warning you. Don't say you weren't warned. Enim reprehenderit qui consectetur id voluptate ipsum.",
  handleClose
};

export const Info = Template.bind({});
Info.args = {
  type: 'info',
  header: 'Info Message!',
  body: 'This message is for your FYI. Dolore aliquip cillum et do exercitation cillum aliqua exercitation ad ex adipisicing. ',
  handleClose
};
