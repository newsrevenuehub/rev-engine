import PagePreview from 'assets/images/page_preview.png';

const pageLive = {
  name: 'Published page',
  page_screenshot: PagePreview,
  published_date: '2021-11-18T21:51:53Z'
};

const pageNotLive = {
  name: 'Not published page',
  page_screenshot: PagePreview,
  published_date: null
};

const pageNoImageLive = {
  name: 'Published page with no preview',
  page_screenshot: null,
  published_date: '2021-11-18T21:51:53Z'
};

const pageNoImageNotLive = {
  name: 'Not published, no preview',
  page_screenshot: null,
  published_date: null
};

export { pageLive, pageNotLive, pageNoImageLive, pageNoImageNotLive };
