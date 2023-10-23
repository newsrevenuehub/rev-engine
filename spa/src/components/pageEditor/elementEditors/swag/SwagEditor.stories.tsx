import { ComponentMeta, ComponentStory } from '@storybook/react';
import SwagEditor from './SwagEditor';

export default {
  component: SwagEditor,
  title: 'ElementEditors/SwagEditor'
} as ComponentMeta<typeof SwagEditor>;

const Template: ComponentStory<typeof SwagEditor> = (props) => <SwagEditor {...props} />;

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
