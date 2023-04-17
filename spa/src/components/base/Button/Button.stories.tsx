import { ComponentMeta, ComponentStory } from '@storybook/react';
import Button, { ButtonProps } from './Button';

export default {
  component: Button,
  title: 'Base/Button',
  parameters: {
    docs: {
      description: {
        component: `A MUI-based button. See [the API](https://v4.mui.com/api/button/) for more details.

If you are using the outlined variant of this component, you should also add the noRipple prop for the proper appearance.`
      }
    }
  }
} as ComponentMeta<typeof Button>;

const Template: ComponentStory<typeof Button> = (args) => {
  const colors = ['error', 'information', 'primaryDark', 'primaryLight', 'secondary', 'text'];

  return (
    <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(2, 200px)' }}>
      {colors.map((color) => (
        <>
          <Button {...args} color={color as ButtonProps['color']} />
          <Button {...args} color={color as ButtonProps['color']} disabled />
        </>
      ))}
      <div style={{ alignItems: 'center', background: 'blue', display: 'grid', padding: 20 }}>
        <Button {...args} variant="outlined" />
      </div>
      <div style={{ alignItems: 'center', background: 'blue', display: 'grid', padding: 20 }}>
        <Button {...args} variant="outlined" disabled />
      </div>
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
