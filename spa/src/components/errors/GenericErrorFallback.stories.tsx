import type { Meta, StoryObj } from '@storybook/react';
import GenericErrorFallback from './GenericErrorFallback';

const meta: Meta<typeof GenericErrorFallback> = {
  title: 'Errors/GenericErrorFallback',
  component: GenericErrorFallback
};

export default meta;
type Story = StoryObj<typeof GenericErrorFallback>;

export const Default: Story = {
  render: () => <GenericErrorFallback />
};
