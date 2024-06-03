import HeaderSection from 'components/common/HeaderSection';
import { CustomIntegrationCard } from 'components/common/IntegrationCard/CustomIntegrationCard';
import { MailchimpIntegrationCard } from 'components/common/IntegrationCard/MailchimpIntegrationCard';
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
        {(['salesforce', 'eventbrite', 'digestbuilder', 'ga', 'newspack'] as const).map((type) => (
          <CustomIntegrationCard key={type} type={type} />
        ))}
      </Content>
    </Wrapper>
  );
};

export default Integration;
