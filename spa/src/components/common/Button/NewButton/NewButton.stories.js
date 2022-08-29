import NewButton, { NEW_BUTTON_TYPE } from './NewButton';

export default {
  title: 'Common/NewButton',
  component: NewButton
};

export const Default = NewButton.bind({});
Default.args = {
  type: NEW_BUTTON_TYPE.PAGE
};

export const Style = NewButton.bind({});
Style.args = {
  type: NEW_BUTTON_TYPE.STYLE
};
