import { Meta, StoryFn } from '@storybook/react';
import ColorsEditor from './ColorsEditor';

export default {
  component: ColorsEditor,
  parameters: {
    // See https://www.chromatic.com/docs/viewports
    chromatic: { viewports: [1280] }
  },
  title: 'StylesEditor/ColorsEditor'
} as Meta<typeof ColorsEditor>;

const Template: StoryFn<typeof ColorsEditor> = (props) => <ColorsEditor {...props} />;

export const Default = Template.bind({});

Default.args = {
  colors: {
    cstm_CTAs: '#ff0000',
    cstm_formPanelBackground: '#00ff00',
    cstm_inputBackground: '#0000ff',
    cstm_inputBorder: '#ffff00',
    cstm_mainBackground: '#ff00ff',
    cstm_mainHeader: '#00ffff',
    cstm_ornaments: '#000000'
  }
};
