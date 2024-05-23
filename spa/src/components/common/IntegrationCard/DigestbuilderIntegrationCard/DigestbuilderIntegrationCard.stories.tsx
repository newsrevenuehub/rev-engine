import { Meta, StoryFn } from '@storybook/react';
import DigestbuilderIntegrationCard from './DigestbuilderIntegrationCard';

export default {
  component: DigestbuilderIntegrationCard,
  title: 'Common/IntegrationCard'
} as Meta<typeof DigestbuilderIntegrationCard>;

const Template: StoryFn<typeof DigestbuilderIntegrationCard> = () => <DigestbuilderIntegrationCard />;

export const Digestbuilder = Template.bind({});
