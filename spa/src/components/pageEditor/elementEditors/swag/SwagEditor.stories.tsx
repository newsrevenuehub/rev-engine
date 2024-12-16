import { Meta, StoryFn } from '@storybook/react';
import SwagEditor from './SwagEditor';

export default {
  component: SwagEditor,
  title: 'ElementEditors/SwagEditor'
} as Meta<typeof SwagEditor>;

const Template: StoryFn<typeof SwagEditor> = (props) => <SwagEditor {...props} />;

export const Default = Template.bind({});
Default.args = {
  elementContent: { swags: [{ swagName: 'Swag Name', swagOptions: ['Option 1', 'Option 2'] }], swagThreshold: 240 },
  setUpdateDisabled: () => {}
};

export const Empty = Template.bind({});
Empty.args = {
  elementContent: { swags: [], swagThreshold: 0 },
  setUpdateDisabled: () => {}
};
