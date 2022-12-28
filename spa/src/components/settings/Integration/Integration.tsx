import HeaderSection from 'components/common/HeaderSection';
import SubheaderSection from 'components/common/SubheaderSection';
import useConnectStripeAccount from 'hooks/useConnectStripeAccount';
import INTEGRATION_TYPES from 'components/common/IntegrationCard/constants';
import IntegrationCard from 'components/common/IntegrationCard';
import useUser from 'hooks/useUser';

import { Content, Wrapper } from './Integration.styled';

const Integration = () => {
  const { user } = useUser();
  const { requiresVerification, sendUserToStripe } = useConnectStripeAccount();
  // TODO: temporary implementation is to get always the FIRST Org from user
  const currentOrganization = user?.organizations?.[0];

  const isActive = (title: string) => {
    switch (title) {
      case INTEGRATION_TYPES.STRIPE.title:
        return !requiresVerification;
      case INTEGRATION_TYPES.SLACK.title:
        return currentOrganization?.show_connected_to_slack;
      case INTEGRATION_TYPES.MAILCHIMP.title:
        return currentOrganization?.show_connected_to_mailchimp;
      case INTEGRATION_TYPES.SALESFORCE.title:
        return currentOrganization?.show_connected_to_salesforce;
      default:
        return false;
    }
  };

  const onChange = (title: string) => {
    switch (title) {
      case INTEGRATION_TYPES.STRIPE.title:
        return requiresVerification ? sendUserToStripe : undefined;
      // TODO: add "onChange" for other integration types (Slack, Salesforce, Mailchimp) when available
      default:
        return undefined;
    }
  };

  return (
    <Wrapper>
      <HeaderSection title="Settings" />
      <SubheaderSection title="Integrations" subtitle="Connect News Revenue Engine to the tools you use every day." />
      <Content>
        {Object.values(INTEGRATION_TYPES).map((integration) => (
          <IntegrationCard
            key={integration.title}
            {...integration}
            isActive={isActive(integration.title)}
            onChange={onChange(integration.title)}
          />
        ))}
      </Content>
    </Wrapper>
  );
};

export default Integration;
