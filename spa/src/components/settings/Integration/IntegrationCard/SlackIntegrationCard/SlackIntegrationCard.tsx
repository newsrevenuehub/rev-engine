import SlackLogo from 'assets/images/slack.png';
import { HELP_URL } from 'constants/helperUrls';
import useUser from 'hooks/useUser';
import { Link } from 'components/base';
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
          <Link href={HELP_URL} target="_blank">
            Support
          </Link>{' '}
          to disconnect.
        </>
      }
      isActive={!!currentOrganization?.show_connected_to_slack}
    />
  );
}

export default SlackIntegrationCard;
