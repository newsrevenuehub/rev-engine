import { ComponentMeta, ComponentStory } from '@storybook/react';
import ColorsEditor from './ColorsEditor';

export default {
  component: ColorsEditor,
  title: 'StylesEditor/ColorsEditor'
} as ComponentMeta<typeof ColorsEditor>;

const Template: ComponentStory<typeof ColorsEditor> = (props) => <ColorsEditor {...props} />;

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
