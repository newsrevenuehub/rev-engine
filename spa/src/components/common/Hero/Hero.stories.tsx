import { Meta, StoryObj } from '@storybook/react';
import Hero from './Hero';

const meta: Meta<typeof Hero> = {
  component: Hero,
  title: 'Common/Hero'
};

export default meta;

type Story = StoryObj<typeof Hero>;

export const Default: Story = {};
Default.args = {
  title: 'Pages',
  subtitle:
    "Welcome to Pages. Here you can create, manage, and publish contribution pages. Create a new page by selecting the 'New Page' button below."
};
