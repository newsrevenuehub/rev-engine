import { ComponentMeta, ComponentStory } from '@storybook/react';
import EditableList from './EditableList';

export default {
  component: EditableList,
  title: 'Base/EditableList'
} as ComponentMeta<typeof EditableList>;

const Template: ComponentStory<typeof EditableList> = (props) => <EditableList {...props} />;

export const Default = Template.bind({});
Default.args = {
  prompt: 'Add a new value',
  value: ['Red', 'Green', 'Blue']
};

export const Invalid = Template.bind({});
Invalid.args = {
  prompt: 'Add a new value',
  validateNewValue: () => 'This rejects all values entered',
  value: ['Red', 'Green', 'Blue']
};

export const NoItems = Template.bind({});
NoItems.args = {
  prompt: 'Add a new value',
  value: []
};
