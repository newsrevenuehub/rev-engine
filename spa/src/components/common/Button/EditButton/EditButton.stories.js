import { BUTTON_TYPE } from 'constants/buttonConstants';
import EditButton from './EditButton';
import { pageLive, pageNotLive, pageNoImageLive, pageNoImageNotLive, styleLive, styleNotLive } from './__mock__';

export default {
  title: 'Common/Button/EditButton',
  component: EditButton,
  argTypes: {
    type: {
      options: Object.values(BUTTON_TYPE)
    }
  }
};

export const Page = EditButton.bind({});
Page.args = pageLive;

export const PageSampler = ({ pages }) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
    {pages.map((page, index) => (
      <EditButton key={index} {...page} onClick={() => {}} />
    ))}
  </div>
);
PageSampler.args = {
  pages: [pageLive, pageNotLive, pageNoImageLive, pageNoImageNotLive]
};

export const Style = EditButton.bind({});
Style.args = styleLive;

export const StyleSampler = ({ styles }) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
    {styles.map((style, index) => (
      <EditButton key={index} {...style} onClick={() => {}} />
    ))}
  </div>
);
StyleSampler.args = {
  styles: [styleLive, styleNotLive]
};
