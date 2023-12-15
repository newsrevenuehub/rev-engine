import type { Meta, StoryObj } from '@storybook/react';

import LiveErrorFallback from './LiveErrorFallback';

const meta: Meta<typeof LiveErrorFallback> = {
  title: 'Errors/LiveErrorFallback',
  component: LiveErrorFallback
};

export default meta;
type Story = StoryObj<typeof LiveErrorFallback>;

export const Default: Story = {};
