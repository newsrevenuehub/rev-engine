import { Meta, StoryObj } from '@storybook/react';
import PublishModal from './PublishModal';

const meta: Meta<typeof PublishModal> = {
  // @ts-expect-error Unclear why Storybook has problems with this specific
  // component, but it's related to the page property.
  component: PublishModal,
  title: 'Common/Button/PublishButton/PublishModal'
};

export default meta;

type Story = StoryObj<typeof PublishModal>;

export const Default: Story = {};
Default.args = {
  open: true,
  page: {
    revenue_program: {
      slug: 'revenue-program'
    }
  } as any
};

export const Loading: Story = {};
Loading.args = {
  ...Default.args,
  loading: true
};

export const SlugError: Story = {};
SlugError.args = {
  ...Default.args,
  slugError: ['Ensure this field has no more than 50 characters.']
};
