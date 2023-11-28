import { ComponentMeta, ComponentStory } from '@storybook/react';
import ContributionFetchError from './ContributionFetchError';

export default {
  component: ContributionFetchError,
  title: 'Contributor/ContributionFetchError'
} as ComponentMeta<typeof ContributionFetchError>;

const Template: ComponentStory<typeof ContributionFetchError> = (props) => <ContributionFetchError {...props} />;

export const Default = Template.bind({});
