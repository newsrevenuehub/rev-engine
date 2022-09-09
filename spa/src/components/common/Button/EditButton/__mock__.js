import PagePreview from 'assets/images/page_preview.png';
import { BUTTON_TYPE, COLOR_LIST } from 'constants/buttonConstants';

const pageLive = {
  type: BUTTON_TYPE.PAGE,
  name: 'Published page',
  page_screenshot: PagePreview,
  published_date: '2021-11-18T21:51:53Z'
};

const pageNotLive = {
  type: BUTTON_TYPE.PAGE,
  name: 'Not published page',
  page_screenshot: PagePreview,
  published_date: null
};

const pageNoImageLive = {
  type: BUTTON_TYPE.PAGE,
  name: 'Published page with no preview',
  page_screenshot: null,
  published_date: '2021-11-18T21:51:53Z'
};

const pageNoImageNotLive = {
  type: BUTTON_TYPE.PAGE,
  name: 'Not published, no preview',
  page_screenshot: null,
  published_date: null
};

const styleLive = {
  type: BUTTON_TYPE.STYLE,
  name: 'Live style',
  style: {
    id: 123,
    used_live: true,
    colors: {
      [COLOR_LIST[0]]: '#6FD1EC',
      [COLOR_LIST[1]]: '#F5FF75',
      [COLOR_LIST[2]]: '#25192B',
      [COLOR_LIST[3]]: '#282828'
    }
  }
};

const styleNotLive = {
  type: BUTTON_TYPE.STYLE,
  name: 'Not live style',
  style: {
    id: 321,
    used_live: false,
    colors: {
      [COLOR_LIST[0]]: 'blue',
      [COLOR_LIST[1]]: 'teal',
      [COLOR_LIST[2]]: 'red',
      [COLOR_LIST[3]]: 'black'
    }
  }
};

export { pageLive, pageNotLive, pageNoImageLive, pageNoImageNotLive, styleLive, styleNotLive };
