import { Meta, StoryObj } from '@storybook/react';
import ContributionFetchError from './ContributionFetchError';

const meta: Meta<typeof ContributionFetchError> = {
  component: ContributionFetchError,
  title: 'Contributor/ContributionFetchError'
};

export default meta;

type Story = StoryObj<typeof ContributionFetchError>;

export const Default: Story = {};
Default.args = {
  message: 'Error message here.'
};
