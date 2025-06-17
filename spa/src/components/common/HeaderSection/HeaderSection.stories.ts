import { Meta, StoryObj } from '@storybook/react';
import HeaderSection from './HeaderSection';

const meta: Meta<typeof HeaderSection> = {
  title: 'Common/HeaderSection',
  component: HeaderSection as any
};

export default meta;

type Story = StoryObj<typeof HeaderSection>;

export const Default: Story = {};

Default.args = {
  title: 'Pages',
  subtitle:
    'Welcome to Pages. Here you can create, manage, and publish contribution pages. Create a new page by selecting the ‘New Page’ button below.'
};
