import { ComponentMeta, ComponentStory } from '@storybook/react';
import PreviewButton from './PreviewButton';

export default {
  component: PreviewButton,
  title: 'Common/Button/PreviewButton'
} as ComponentMeta<typeof PreviewButton>;

const Template: ComponentStory<typeof PreviewButton> = (props) => <PreviewButton {...props} />;

export const Default = Template.bind({});

Default.args = {
  corner: <div style={{ background: 'green' }}>Corner</div>,
  preview: (
    <div
      style={{ alignItems: 'center', background: 'blue', color: 'white', display: 'flex', justifyContent: 'center' }}
    >
      Preview
    </div>
  ),
  label: <div style={{ background: 'yellow' }}>Label</div>
};

export const Disabled = Template.bind({});

Disabled.args = {
  ...Default.args,
  disabled: true
};
