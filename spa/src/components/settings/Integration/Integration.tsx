import { Redirect } from 'react-router-dom';
import HeaderSection from 'components/common/HeaderSection';
import SubheaderSection from 'components/common/SubheaderSection';
import { StripeIntegrationCard } from 'components/common/IntegrationCard/StripeIntegrationCard';
import { SlackIntegrationCard } from 'components/common/IntegrationCard/SlackIntegrationCard';
import { MailchimpIntegrationCard } from 'components/common/IntegrationCard/MailchimpIntegrationCard';
import { SalesforceIntegrationCard } from 'components/common/IntegrationCard/SalesforceIntegrationCard';

import { CONTENT_SLUG } from 'routes';
import useUser from 'hooks/useUser';

import { Content, Wrapper } from './Integration.styled';

const Integration = () => {
  const { user, isLoading } = useUser();
  const userHasSingleOrg = user?.organizations?.length === 1;

  if (!isLoading && !userHasSingleOrg) {
    return <Redirect to={CONTENT_SLUG} />;
  }

  return (
    <Wrapper>
      <HeaderSection title="Settings" />
      <SubheaderSection title="Integrations" subtitle="Connect News Revenue Engine to the tools you use every day." />
      <Content>
        <StripeIntegrationCard />
        <SlackIntegrationCard />
        <MailchimpIntegrationCard />
        <SalesforceIntegrationCard />
      </Content>
    </Wrapper>
  );
};

export default Integration;
