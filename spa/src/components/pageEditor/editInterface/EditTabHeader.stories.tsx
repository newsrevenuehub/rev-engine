import { ComponentMeta, ComponentStory } from '@storybook/react';
import EditTabHeader from './EditTabHeader';

export default {
  component: EditTabHeader,
  title: 'Page Editor/EditTabHeader'
} as ComponentMeta<typeof EditTabHeader>;

const Template: ComponentStory<typeof EditTabHeader> = (props) => <EditTabHeader {...props} />;

export const Default = Template.bind({});

Default.args = {
  addButtonLabel: 'Add Block',
  prompt: 'This is the prompt text.'
};

export const NoButton = Template.bind({});

NoButton.args = {
  prompt: "This header doesn't have a button."
};
