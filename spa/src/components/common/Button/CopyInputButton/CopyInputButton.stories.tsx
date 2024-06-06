import { Meta, StoryFn } from '@storybook/react';
import CopyInputButton from './CopyInputButton';

export default {
  title: 'Common/Button/CopyInputButton',
  component: CopyInputButton,
  parameters: {
    backgrounds: {
      default: 'Header color'
    }
  }
} as Meta<typeof CopyInputButton>;

const Template: StoryFn<typeof CopyInputButton> = (args) => <CopyInputButton {...args} />;

export const Default = Template.bind({});
Default.args = {
  title: 'Contributor Page Link',
  link: 'www.page-link.com',
  setCopied: () => {},
  copied: ''
};

export const Copied = Template.bind({});
Copied.args = {
  title: 'Contributor Page Link',
  link: 'www.page-link.com',
  setCopied: () => {},
  copied: 'www.page-link.com'
};
