import { ComponentMeta, ComponentStory } from '@storybook/react';
import RouterLinkButton, { RouterLinkButtonProps } from './RouterLinkButton';

export default {
  component: RouterLinkButton,
  title: 'Base/RouterLinkButton',
  parameters: {
    docs: {
      description: {
        component: 'Like Button, but renders a react-router link.'
      }
    }
  }
} as ComponentMeta<typeof RouterLinkButton>;

const Template: ComponentStory<typeof RouterLinkButton> = (args) => {
  const colors = ['error', 'information', 'primaryDark', 'primaryLight', 'secondary', 'text'];

  return (
    <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(2, 200px)' }}>
      {colors.map((color) => (
        <>
          <RouterLinkButton {...args} color={color as RouterLinkButtonProps['color']} to="/" />
          <RouterLinkButton {...args} color={color as RouterLinkButtonProps['color']} to="/" />
        </>
      ))}
    </div>
  );
};

export const Small = Template.bind({});
Small.args = { children: 'Hello World', size: 'small' };

export const Medium = Template.bind({});
Medium.args = { children: 'Hello World', size: 'medium' };

export const Large = Template.bind({});
Large.args = { children: 'Hello World', size: 'large' };

export const ExtraLarge = Template.bind({});
ExtraLarge.args = { children: 'Hello World', size: 'extraLarge' };
