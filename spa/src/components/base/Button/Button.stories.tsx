import { Meta, StoryFn } from '@storybook/react';
import Icon from '@material-design-icons/svg/filled/block.svg?react';
import Button, { ButtonProps } from './Button';

const meta: Meta<typeof Button> = {
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
};

export default meta;

const Template: StoryFn<typeof Button> = (args) => {
  const colors = ['error', 'information', 'primaryDark', 'primaryLight', 'secondary', 'text'];

  return (
    <>
      <table>
        <thead>
          <tr>
            <th style={{ width: 200 }}>Normal</th>
            <th style={{ width: 200 }}>Disabled</th>
            <th style={{ width: 200 }}>Active/Pressed</th>
          </tr>
        </thead>
        <tbody>
          {colors.map((color) => (
            <tr>
              <td>
                <Button {...args} color={color as ButtonProps['color']} fullWidth />
              </td>
              <td>
                <Button {...args} color={color as ButtonProps['color']} fullWidth disabled />
              </td>
              <td>
                <Button {...args} color={color as ButtonProps['color']} fullWidth aria-pressed />
              </td>
            </tr>
          ))}
          <tr>
            <td style={{ alignItems: 'center', background: 'blue', padding: 20 }}>
              <Button {...args} variant="outlined" />
            </td>
            <td style={{ alignItems: 'center', background: 'blue', padding: 20 }}>
              <Button {...args} variant="outlined" disabled />
            </td>
          </tr>
        </tbody>
      </table>
      <table style={{ marginTop: 20 }}>
        <thead>
          <tr>
            <th style={{ width: 200 }}>Start Icon</th>
            <th style={{ width: 200 }}>End Icon</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <Button fullWidth startIcon={<Icon />} {...args} color="primaryDark" />
            </td>
            <td>
              <Button fullWidth endIcon={<Icon />} {...args} color="primaryDark" />
            </td>
          </tr>
          <tr>
            <td>
              <Button fullWidth startIcon={<Icon />} {...args} color="primaryLight" />
            </td>
            <td>
              <Button fullWidth endIcon={<Icon />} {...args} color="primaryLight" />
            </td>
          </tr>
        </tbody>
      </table>
    </>
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
