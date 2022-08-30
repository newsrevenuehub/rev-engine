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
};

export const Default = NewButton.bind({});
Default.args = {
  type: BUTTON_TYPE.PAGE
};

export const Style = NewButton.bind({});
Style.args = {
  type: BUTTON_TYPE.STYLE
};
