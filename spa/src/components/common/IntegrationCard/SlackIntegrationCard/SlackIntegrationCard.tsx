import SlackLogo from 'assets/images/slack.png';
import { HELP_URL } from 'constants/helperUrls';
import useUser from 'hooks/useUser';

import IntegrationCard from '../IntegrationCard';

export function SlackIntegrationCard() {
  const { user } = useUser();
  const currentOrganization = user?.organizations?.length === 1 ? user?.organizations?.[0] : undefined;

  return (
    <IntegrationCard
      image={SlackLogo}
      title="Slack"
      isRequired={false}
      site={{
        label: 'slack.com',
        url: 'https://www.slack.com'
      }}
      description="Bring team communication and collaboration into one place. Get contributions notifications in real time."
      disabled
      toggleTooltipMessage="Coming Soon"
      toggleConnectedTooltipMessage={
        <>
          Connected to Slack. Contact{' '}
          <a href={HELP_URL} style={{ textDecoration: 'underline' }} target="_blank" rel="noreferrer">
            Support
          </a>{' '}
          to disconnect.
        </>
      }
      isActive={!!currentOrganization?.show_connected_to_slack}
    />
  );
}

export default SlackIntegrationCard;
