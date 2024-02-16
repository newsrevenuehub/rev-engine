import { Meta, StoryObj } from '@storybook/react';
import MobileBackButton from './MobileBackButton';

const meta: Meta<typeof MobileBackButton> = {
  component: MobileBackButton,
  title: 'Contributor/MobileBackButton'
};

export default meta;

type Story = StoryObj<typeof MobileBackButton>;

export const Default: Story = {};
