import { ComponentMeta, ComponentStory } from '@storybook/react';
import PublishButton, { PublishButtonProps } from './PublishButton';

// need to wrap with query client provider

export default {
  title: 'Common/Button/PublishButton',
  component: PublishButton,
  argTypes: {
    published_date: {
      type: 'string'
    }
  }
} as ComponentMeta<typeof PublishButton>;

const Template: ComponentStory<typeof PublishButton> = (props: Partial<PublishButtonProps>) => (
  <div style={{ backgroundColor: '#523A5E', padding: 10, display: 'flex', justifyContent: 'end' }}>
    <PublishButton {...props} />
  </div>
);

export const Default = Template.bind({});

Default.args = {
  setPage: () => {},
  requestPatchPage: () => {},
  page: {
    name: 'Contribution page',
    revenue_program: {
      slug: 'news-revenue-hub'
    },
    payment_provider: {
      stripe_verified: true
    }
  }
} as any;

export const Disabled = Template.bind({});

Disabled.args = {
  setPage: () => {},
  requestPatchPage: () => {},
  page: {
    name: 'Contribution page',
    revenue_program: {
      slug: 'news-revenue-hub'
    },
    payment_provider: {}
  }
} as any;

export const Published = Template.bind({});

Published.args = {
  setPage: () => {},
  requestPatchPage: () => {},
  page: {
    name: 'Contribution page',
    slug: 'published-page',
    revenue_program: {
      slug: 'news-revenue-hub'
    },
    payment_provider: {
      stripe_verified: true
    },
    published_date: '2021-11-18T21:51:53Z'
  }
} as any;

export const PreviouslyPublished = Template.bind({});

PreviouslyPublished.args = {
  setPage: () => {},
  requestPatchPage: () => {},
  page: {
    name: 'Contribution page',
    revenue_program: {
      slug: 'news-revenue-hub'
    },
    slug: 'previous-slug',
    payment_provider: {
      stripe_verified: true
    },
    published_date: '2051-11-18T21:51:53Z'
  }
} as any;
