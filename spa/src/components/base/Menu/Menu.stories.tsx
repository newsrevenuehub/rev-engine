import { Meta, StoryObj } from '@storybook/react';
import Menu from './Menu';

const meta: Meta<typeof Menu> = {
  component: Menu,
  title: 'Base/Menu'
};

export default meta;

type Story = StoryObj<typeof Menu>;

export const Default: Story = {};
Default.args = {
  children: <div>Child</div>,
  open: true
};
