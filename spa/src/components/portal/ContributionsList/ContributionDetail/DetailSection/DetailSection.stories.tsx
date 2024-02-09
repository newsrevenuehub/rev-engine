import { Meta, StoryObj } from '@storybook/react';
import DetailSection from './DetailSection';

const meta: Meta<typeof DetailSection> = {
  component: DetailSection,
  title: 'Contributor/DetailSection'
};

export default meta;

type Story = StoryObj<typeof DetailSection>;

export const Default: Story = {};
Default.args = {
  disabled: false,
  highlighted: false,
  title: 'Title',
  children: 'Content',
  controls: 'Controls'
};

export const Disabled: Story = {};
Disabled.args = {
  disabled: true,
  title: 'Title',
  children: 'Children',
  controls: 'Controls'
};

export const Highlighted: Story = {};
Highlighted.args = {
  highlighted: true,
  title: 'Title',
  children: 'Children',
  controls: 'Controls'
};
