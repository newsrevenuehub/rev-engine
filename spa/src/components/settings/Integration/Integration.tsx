import HeaderSection from 'components/common/HeaderSection';
import { DigestbuilderIntegrationCard } from 'components/common/IntegrationCard/DigestbuilderIntegrationCard';
import { EventbriteIntegrationCard } from 'components/common/IntegrationCard/EventbriteIntegrationCard';
import { GoogleAnalyticsIntegrationCard } from 'components/common/IntegrationCard/GoogleAnalyticsIntegrationCard';
import { MailchimpIntegrationCard } from 'components/common/IntegrationCard/MailchimpIntegrationCard';
import { NewspackIntegrationCard } from 'components/common/IntegrationCard/NewspackIntegrationCard';
import { SalesforceIntegrationCard } from 'components/common/IntegrationCard/SalesforceIntegrationCard';
import { SlackIntegrationCard } from 'components/common/IntegrationCard/SlackIntegrationCard';
import { StripeIntegrationCard } from 'components/common/IntegrationCard/StripeIntegrationCard';
import SubheaderSection from 'components/common/SubheaderSection';
import { Content, Wrapper } from './Integration.styled';

const Integration = () => {
  return (
    <Wrapper>
      <HeaderSection title="Settings" />
      <SubheaderSection title="Integrations" subtitle="Connect News Revenue Engine to the tools you use every day." />
      <Content>
        <StripeIntegrationCard />
        <SlackIntegrationCard />
        <MailchimpIntegrationCard />
      </Content>
      <SubheaderSection title="Custom Features" subtitle="Contact Support to enable custom integrations." />
      <Content>
        <SalesforceIntegrationCard />
        <EventbriteIntegrationCard />
        <DigestbuilderIntegrationCard />
        <GoogleAnalyticsIntegrationCard />
        <NewspackIntegrationCard />
      </Content>
    </Wrapper>
  );
};

export default Integration;
