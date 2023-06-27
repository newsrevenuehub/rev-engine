import { ComponentMeta, ComponentStory } from '@storybook/react';
import ContributionPageButton from './ContributionPageButton';

const sampleImage = `data:image/svg+xml;base64,${window.btoa(`
<svg xmlns="http://www.w3.org/2000/svg" height="100" width="100">
  <defs>
    <pattern id="p" height="8" width="8" patternUnits="userSpaceOnUse">
      <path fill="#000000" fill-rule="evenodd" d="M0 0h4v4H0V0zm4 4h4v4H4V4z"/>
    </pattern>
  </defs>
  <rect x="0" y="0" width="100" height="100" style="fill: url(#p)" />
</svg>
`)}`;

const samplePage: any = {
  name: 'Page Name',
  page_screenshot: sampleImage,
  revenue_program: {
    default_donation_page: null
  }
};

export default {
  component: ContributionPageButton,
  title: 'Common/Button/ContributionPageButton'
} as ComponentMeta<typeof ContributionPageButton>;

const Template: ComponentStory<typeof ContributionPageButton> = (props) => <ContributionPageButton {...props} />;

export const Default = Template.bind({});
Default.args = {
  page: samplePage
};

export const DefaultPage = Template.bind({});
DefaultPage.args = {
  page: {
    ...samplePage,
    id: 'id',
    revenue_program: {
      default_donation_page: 'id'
    }
  } as any
};

export const NoPreview = Template.bind({});
NoPreview.args = {
  page: {
    ...samplePage,
    page_screenshot: null
  }
};

export const NoPreviewPublished = Template.bind({});
NoPreviewPublished.args = {
  page: {
    ...samplePage,
    page_screenshot: null,
    published_date: new Date('January 1, 2000')
  }
};

export const Published = Template.bind({});
Published.args = {
  page: {
    ...samplePage,
    published_date: new Date('January 1, 2000')
  } as any
};
