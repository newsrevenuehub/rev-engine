import { ComponentMeta, ComponentStory } from '@storybook/react';
import NoContributions from './NoContributions';

export default {
  component: NoContributions,
  title: 'Contributor/NoContributions'
} as ComponentMeta<typeof NoContributions>;

const Template: ComponentStory<typeof NoContributions> = (props) => <NoContributions />;

export const Default = Template.bind({});
