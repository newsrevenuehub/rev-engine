import HeaderSection from 'components/common/HeaderSection';
import SubheaderSection from 'components/common/SubheaderSection';
import useConnectStripeAccount from 'hooks/useConnectStripeAccount';
import INTEGRATION_TYPES from 'components/common/IntegrationCard/constants';
import IntegrationCard from 'components/common/IntegrationCard';

import { Content, Wrapper } from './Integration.styled';

const Integration = () => {
  const { requiresVerification } = useConnectStripeAccount();

  const isActive = (title: string) => {
    switch (title) {
      case INTEGRATION_TYPES.STRIPE.title:
        return !requiresVerification;
      // TODO: add "isActive" for other integration types (Slack, Salesforce, Mailchimp) when available
      default:
        return false;
    }
  };

  return (
    <Wrapper>
      <HeaderSection title="Settings" />
      <SubheaderSection title="Integrations" subtitle="Connect News Revenue Engine to the tools you use every day." />
      <Content>
        {Object.values(INTEGRATION_TYPES).map((integration) => (
          <IntegrationCard key={integration.title} {...integration} isActive={isActive(integration.title)} />
        ))}
      </Content>
    </Wrapper>
  );
};

export default Integration;
