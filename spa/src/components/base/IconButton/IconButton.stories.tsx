import { ComponentMeta, ComponentStory } from '@storybook/react';
import IconButton, { IconButtonProps } from './IconButton';
import { EditOutlined } from '@material-ui/icons';

export default {
  component: IconButton,
  title: 'Base/IconButton',
  parameters: {
    docs: {
      description: {
        component: 'A MUI-based button. See [the API](https://v4.mui.com/api/icon-button/) for more details.'
      }
    }
  }
} as ComponentMeta<typeof IconButton>;

const Template: ComponentStory<typeof IconButton> = (args) => {
  const colors = ['error', 'information', 'primaryDark', 'primaryLight', 'secondary', 'text'];

  return (
    <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(2, min-content)' }}>
      {colors.map((color) => (
        <>
          <IconButton {...args} color={color as IconButtonProps['color']} />
          <IconButton {...args} color={color as IconButtonProps['color']} disabled />
        </>
      ))}
    </div>
  );
};

export const Small = Template.bind({});
Small.args = { children: <EditOutlined />, size: 'small' };

export const Medium = Template.bind({});
Medium.args = { children: <EditOutlined />, size: 'medium' };

export const Large = Template.bind({});
Large.args = { children: <EditOutlined />, size: 'large' };

export const ExtraLarge = Template.bind({});
ExtraLarge.args = { children: <EditOutlined />, size: 'extraLarge' };
