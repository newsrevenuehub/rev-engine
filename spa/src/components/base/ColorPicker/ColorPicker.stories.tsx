import { Meta, StoryFn } from '@storybook/react';
import { useState } from 'react';
import ColorPicker from './ColorPicker';

export default {
  component: ColorPicker,
  title: 'Base/ColorPicker'
} as Meta<typeof ColorPicker>;

const Template: StoryFn<typeof ColorPicker> = (props) => <ColorPicker {...props} />;

export const Blue = Template.bind({});

Blue.args = {
  id: 'blue',
  label: 'Color',
  value: '#0000ff'
};

export const Gray = Template.bind({});

Gray.args = {
  id: 'gray',
  label: 'Color',
  value: '#808080'
};

export const White = Template.bind({});

White.args = {
  id: 'white',
  label: 'Color',
  value: '#ffffff'
};

const ControlledTemplate: StoryFn<typeof ColorPicker> = (props) => {
  const [value, setValue] = useState('');

  return <ColorPicker {...props} onChange={setValue} value={value} />;
};

export const Controlled = ControlledTemplate.bind({});

Controlled.args = {
  helperText: 'This should update when interacted with.',
  id: 'controlled',
  label: 'Color'
};
