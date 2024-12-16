import { Meta, StoryFn } from '@storybook/react';
import StyleButton from './StyleButton';

export default {
  component: StyleButton,
  title: 'Common/Button/StyleButton'
} as Meta<typeof StyleButton>;

const Template: StoryFn<typeof StyleButton> = (props) => <StyleButton {...props} />;

export const Default = Template.bind({});
Default.args = {
  style: {
    colors: {
      cstm_mainBackground: 'red',
      cstm_formPanelBackground: 'orange',
      cstm_mainHeader: 'yellow',
      cstm_CTAs: 'green'
    },
    name: 'Style Name',
    used_live: false
  } as any
};

export const Live = Template.bind({});
Live.args = {
  style: {
    colors: {
      cstm_mainBackground: 'blue',
      cstm_formPanelBackground: 'indigo',
      cstm_mainHeader: 'violet',
      cstm_CTAs: 'red'
    },
    name: 'Style Name',
    used_live: true
  } as any
};

export const MissingColors = Template.bind({});
MissingColors.args = {
  style: {
    colors: {
      cstm_mainHeader: 'yellow'
    },
    name: 'Style Name',
    used_live: false
  } as any
};
