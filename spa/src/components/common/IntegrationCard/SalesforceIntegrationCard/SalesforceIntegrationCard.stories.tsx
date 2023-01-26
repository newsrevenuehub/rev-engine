import { ComponentMeta, ComponentStory } from '@storybook/react';
import SalesforceIntegrationCard from './SalesforceIntegrationCard';

export default {
  component: SalesforceIntegrationCard,
  title: 'Common/IntegrationCard'
} as ComponentMeta<typeof SalesforceIntegrationCard>;

const Template: ComponentStory<typeof SalesforceIntegrationCard> = () => <SalesforceIntegrationCard />;

export const Salesforce = Template.bind({});
