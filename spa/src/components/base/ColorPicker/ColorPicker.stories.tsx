import { ComponentMeta, ComponentStory } from '@storybook/react';
import { FormControlLabel } from '../FormControlLabel';
import ColorPicker from './ColorPicker';

export default {
  component: ColorPicker,
  title: 'Base/ColorPicker'
} as ComponentMeta<typeof ColorPicker>;

const Template: ComponentStory<typeof ColorPicker> = (props) => <ColorPicker {...props} />;

export const Unlabeled = Template.bind({});
Unlabeled.args = {
  value: '#0000ff'
};

const LabeledTemplate: ComponentStory<typeof ColorPicker> = (props) => (
  <FormControlLabel control={<ColorPicker {...props} />} label="Label" labelPlacement="top" />
);

export const Labeled = LabeledTemplate.bind({});
Labeled.args = {
  value: '#123456'
};
