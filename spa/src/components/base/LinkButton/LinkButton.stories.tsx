import { Meta, StoryFn } from '@storybook/react';
import LinkButton, { LinkButtonProps } from './LinkButton';

export default {
  component: LinkButton,
  title: 'Base/LinkButton',
  parameters: {
    docs: {
      description: {
        component: 'Like Button, but renders an <a> tag into the DOM.'
      }
    }
  }
} as Meta<typeof LinkButton>;

const Template: StoryFn<typeof LinkButton> = (args) => {
  const colors = ['error', 'information', 'primaryDark', 'primaryLight', 'secondary', 'text'];

  return (
    <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(2, 200px)' }}>
      {colors.map((color) => (
        <>
          <LinkButton {...args} color={color as LinkButtonProps['color']} href="https://fundjournalism.org" />
          <LinkButton {...args} color={color as LinkButtonProps['color']} disabled href="https://fundjournalism.org" />
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
