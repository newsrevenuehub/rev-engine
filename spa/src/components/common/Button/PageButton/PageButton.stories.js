import PageButton from './PageButton';
import { pageLive, pageNotLive, pageNoImageLive, pageNoImageNotLive } from './__mock__';

export default {
  title: 'Common/PageButton',
  component: PageButton
};

export const Default = PageButton.bind({});
Default.args = pageLive;

export const Sampler = ({ pages }) => (
  <div style={{ display: 'flex', flex: 'wrap', gap: '16px' }}>
    {pages.map((page, index) => (
      <PageButton key={index} {...page} />
    ))}
  </div>
);
Sampler.args = {
  pages: [pageLive, pageNotLive, pageNoImageLive, pageNoImageNotLive]
};
