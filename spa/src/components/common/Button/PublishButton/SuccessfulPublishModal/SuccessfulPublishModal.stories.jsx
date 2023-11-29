import SuccessfulPublishModal from './SuccessfulPublishModal';

export default {
  title: 'Common/Modal/SuccessfulPublishModal',
  component: SuccessfulPublishModal,
  argTypes: {
    published_date: {
      type: 'string'
    }
  }
};

const render = (args) => <SuccessfulPublishModal {...args} />;

export const Default = (args) => render(args);

Default.args = {
  open: true,
  onClose: () => {},
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
};
