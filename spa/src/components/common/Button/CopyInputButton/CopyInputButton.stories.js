import CopyInputButton from './CopyInputButton';

export default {
  title: 'Common/Button/CopyInputButton',
  component: CopyInputButton,
  parameters: {
    backgrounds: {
      default: 'Header color'
    }
  }
};

export const Default = (args) => <CopyInputButton {...args} />;

Default.args = {
  title: 'Contributor Page Link',
  link: 'www.page-link.com',
  setCopied: () => {},
  copied: ''
};

export const Copied = (args) => <CopyInputButton {...args} />;

Copied.args = {
  title: 'Contributor Page Link',
  link: 'www.page-link.com',
  setCopied: () => {},
  copied: 'www.page-link.com'
};
