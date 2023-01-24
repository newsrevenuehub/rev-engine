import { ComponentMeta, ComponentStory } from '@storybook/react';

import ColorPickerPreview from './ColorPickerPreview';

export default {
  title: 'Common/ColorPickerPreview',
  component: ColorPickerPreview
} as ComponentMeta<typeof ColorPickerPreview>;

export const Default: ComponentStory<typeof ColorPickerPreview> = (args) => <ColorPickerPreview {...args} />;

Default.args = {
  headerColor: '#000000',
  backgroundColor: '#523A5E',
  panelBackgroundColor: '#F2FF59',
  buttonsColor: '#60E0F9',
  accentsColor: '#008E7C',
  // Temporary
  inputBackgroundColor: '#ffffff',
  inputBorderColor: '#c4c4c4'
};
