import GrabLink from './GrabLink';

export default {
  title: 'Common/Button/GrabLink',
  component: GrabLink,
  parameters: {
    backgrounds: {
      default: 'Header color'
    }
  }
};

export const Default = (args) => (
  <div style={{ backgroundColor: '#523A5E', padding: 10, display: 'flex', justifyContent: 'end' }}>
    <GrabLink {...args} />
  </div>
);
Default.args = {
  page: {
    revenue_program: {
      slug: 'news-revenue-hub'
    },
    slug: 'donate',
    published_date: '2021-11-18T21:51:53Z'
  }
};
