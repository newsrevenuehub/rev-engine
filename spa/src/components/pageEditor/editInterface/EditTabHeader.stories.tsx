import { Meta, StoryFn } from '@storybook/react';
import EditTabHeader from './EditTabHeader';

export default {
  component: EditTabHeader,
  title: 'Page Editor/EditTabHeader'
} as Meta<typeof EditTabHeader>;

const Template: StoryFn<typeof EditTabHeader> = (props) => <EditTabHeader {...props} />;

export const Default = Template.bind({});

Default.args = {
  addButtonLabel: 'Add Block',
  prompt: 'This is the prompt text.'
};

export const NoButton = Template.bind({});

NoButton.args = {
  prompt: "This header doesn't have a button."
};
