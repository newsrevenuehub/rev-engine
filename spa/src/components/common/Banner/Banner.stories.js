import { BANNER_TYPE } from 'constants/bannerConstants';

import Banner from './Banner';

export default {
  title: 'Common/Banner',
  component: Banner,
  argTypes: {
    type: {
      options: Object.values(BANNER_TYPE)
    }
  }
};

export const Default = Banner.bind({});
Default.args = {
  type: BANNER_TYPE.STRIPE
};

export const Selected = Banner.bind({});
Selected.args = {};
