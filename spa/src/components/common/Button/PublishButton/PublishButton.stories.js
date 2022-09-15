import PublishButton from './PublishButton';

export default {
  title: 'Common/Button/PublishButton',
  component: PublishButton,
  argTypes: {
    published_date: {
      type: 'string'
    }
  }
};

const render = (args) => (
  <div style={{ backgroundColor: '#523A5E', padding: 10, display: 'flex', justifyContent: 'end' }}>
    <PublishButton {...args} />
  </div>
);

export const Default = (args) => render(args);

Default.args = {
  setPage: () => {},
  requestPatchPage: () => {},
  page: {
    name: 'Donation page',
    revenue_program: {
      slug: 'news-revenue-hub'
    },
    payment_provider: {
      stripe_verified: true
    }
  }
};

export const Disabled = (args) => render(args);

Disabled.args = {
  setPage: () => {},
  requestPatchPage: () => {},
  page: {
    name: 'Donation page',
    revenue_program: {
      slug: 'news-revenue-hub'
    },
    payment_provider: {}
  }
};

export const Published = (args) => render(args);

Published.args = {
  setPage: () => {},
  requestPatchPage: () => {},
  page: {
    name: 'Donation page',
    slug: 'published-page',
    revenue_program: {
      slug: 'news-revenue-hub'
    },
    payment_provider: {
      stripe_verified: true
    },
    published_date: '2021-11-18T21:51:53Z'
  }
};

export const PreviouslyPublished = (args) => render(args);

PreviouslyPublished.args = {
  setPage: () => {},
  requestPatchPage: () => {},
  page: {
    name: 'Donation page',
    revenue_program: {
      slug: 'news-revenue-hub'
    },
    slug: 'previous-slug',
    payment_provider: {
      stripe_verified: true
    },
    published_date: '2051-11-18T21:51:53Z'
  }
};
