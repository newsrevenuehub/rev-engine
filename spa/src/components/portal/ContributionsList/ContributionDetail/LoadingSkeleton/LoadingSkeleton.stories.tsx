import { Meta, StoryObj } from '@storybook/react';
import LoadingSkeleton from './LoadingSkeleton';

const LoadingSkeletonDemo = () => <LoadingSkeleton />;

const meta: Meta<typeof LoadingSkeletonDemo> = {
  component: LoadingSkeletonDemo,
  title: 'Contributor/LoadingSkeleton'
};

export default meta;

type Story = StoryObj<typeof LoadingSkeletonDemo>;

export const Default: Story = {};
