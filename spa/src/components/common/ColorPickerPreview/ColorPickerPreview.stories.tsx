import { Meta, StoryFn } from '@storybook/react';

import ColorPickerPreview from './ColorPickerPreview';

export default {
  title: 'Common/ColorPickerPreview',
  component: ColorPickerPreview
} as Meta<typeof ColorPickerPreview>;

export const Default: StoryFn<typeof ColorPickerPreview> = (args) => <ColorPickerPreview {...args} />;

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
