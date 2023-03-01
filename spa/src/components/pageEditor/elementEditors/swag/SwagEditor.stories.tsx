import { ComponentMeta, ComponentStory } from '@storybook/react';
import SwagEditor from './SwagEditor';

export default {
  component: SwagEditor,
  title: 'ElementEditors/SwagEditor'
} as ComponentMeta<typeof SwagEditor>;

const Template: ComponentStory<typeof SwagEditor> = (props) => <SwagEditor {...props} />;

export const Default = Template.bind({});
Default.args = {
  elementContent: {},
  pagePreview: {} as any,
  setUpdateDisabled: () => {}
};

export const WithNYT = Template.bind({});
WithNYT.args = {
  elementContent: {},
  pagePreview: {
    allow_offer_nyt_comp: true
  } as any,
  setUpdateDisabled: () => {}
};
