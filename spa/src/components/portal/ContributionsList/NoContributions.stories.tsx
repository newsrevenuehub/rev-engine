import { Meta, StoryFn } from '@storybook/react';
import NoContributions from './NoContributions';

export default {
  component: NoContributions,
  title: 'Contributor/NoContributions'
} as Meta<typeof NoContributions>;

const Template: StoryFn<typeof NoContributions> = () => <NoContributions />;

export const Default = Template.bind({});
