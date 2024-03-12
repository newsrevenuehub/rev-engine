import { Meta, StoryObj } from '@storybook/react';
import ContributionsHeader from './ContributionsHeader';

const meta: Meta<typeof ContributionsHeader> = {
  component: ContributionsHeader,
  title: 'Contributor/ContributionsHeader'
};

export default meta;

type Story = StoryObj<typeof ContributionsHeader>;

export const Default: Story = {};
Default.args = {
  defaultPage: {
    revenue_program: {
      slug: 'rp-slug'
    },
    slug: 'page-slug'
  } as any,
  revenueProgram: {
    website_url: 'https://fundjournalism.org'
  } as any
};

export const OnlyReturnToWebsite: Story = {};
OnlyReturnToWebsite.args = {
  revenueProgram: {
    website_url: 'https://fundjournalism.org'
  } as any
};

export const OnlyNewContribution: Story = {};
OnlyNewContribution.args = {
  defaultPage: {
    revenue_program: {
      slug: 'rp-slug'
    },
    slug: 'page-slug'
  } as any
};

export const Nothing: Story = {};
Nothing.args = {};
