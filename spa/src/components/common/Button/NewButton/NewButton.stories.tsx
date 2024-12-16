import { Meta, StoryFn } from '@storybook/react';
import NewButton from './NewButton';

export default {
  component: NewButton,
  title: 'Common/Button/NewButton'
} as Meta<typeof NewButton>;

const Template: StoryFn<typeof NewButton> = (props) => <NewButton {...props} />;

export const Default = Template.bind({});
Default.args = {
  label: <>New Page</>
};

export const Disabled = Template.bind({});
Disabled.args = {
  disabled: true,
  label: <>New Page</>
};

export const Style = Template.bind({});
Style.args = {
  label: <>New Style</>,
  previewHeight: 70
};

export const StyleDisabled = Template.bind({});
StyleDisabled.args = {
  disabled: true,
  label: <>New Style</>,
  previewHeight: 70
};
