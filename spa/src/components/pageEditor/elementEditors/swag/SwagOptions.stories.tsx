import { Meta, StoryFn } from '@storybook/react';
import SwagOptions from './SwagOptions';

export default {
  component: SwagOptions,
  title: 'ElementEditors/SwagOptions'
} as Meta<typeof SwagOptions>;

const Template: StoryFn<typeof SwagOptions> = (props) => <SwagOptions {...props} />;

export const Default = Template.bind({});
Default.args = {
  swagName: 'Swag Name',
  swagOptions: ['Option 1', 'Option 2']
};

export const Empty = Template.bind({});
Empty.args = {
  swagName: '',
  swagOptions: []
};
