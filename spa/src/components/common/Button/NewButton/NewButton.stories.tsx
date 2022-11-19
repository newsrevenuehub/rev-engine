import { ComponentMeta, ComponentStory } from '@storybook/react';
import { BUTTON_TYPE } from 'constants/buttonConstants';
import NewButton from './NewButton';

export default {
  title: 'Common/Button/NewButton',
  component: NewButton,
  argTypes: {
    type: {
      options: Object.values(BUTTON_TYPE)
    }
  }
} as ComponentMeta<typeof NewButton>;

export const Default: ComponentStory<typeof NewButton> = NewButton.bind({});
Default.args = {
  type: BUTTON_TYPE.PAGE
};

export const Style: ComponentStory<typeof NewButton> = NewButton.bind({});
Style.args = {
  type: BUTTON_TYPE.STYLE
};

export const Disabled: ComponentStory<typeof NewButton> = NewButton.bind({});
Disabled.args = { ...Default.args, disabled: true };
