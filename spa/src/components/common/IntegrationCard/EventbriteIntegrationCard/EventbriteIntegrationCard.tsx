import EventbriteLogo from 'assets/images/eventbrite.png';
import { HELP_URL } from 'constants/helperUrls';
import useUser from 'hooks/useUser';
import IntegrationCard from '../IntegrationCard';

export function EventbriteIntegrationCard() {
  const { user } = useUser();
  const currentOrganization = user?.organizations?.length === 1 ? user?.organizations?.[0] : undefined;

  return (
    <IntegrationCard
      image={EventbriteLogo}
      title="Eventbrite"
      isRequired={false}
      site={{
        label: 'eventbrite.com',
        url: 'https://www.eventbrite.com'
      }}
      description="Sync your event data - including attendees, revenue and new email signups - to Salesforce."
      toggleLabel={
        <>
          Contact{' '}
          <a href={HELP_URL} style={{ textDecoration: 'underline' }} target="_blank" rel="noreferrer">
            Support
          </a>{' '}
          to Connect
        </>
      }
      toggleTooltipMessage="Contact our Support Staff to integrate with Eventbrite"
      disabled
      toggleConnectedTooltipMessage={
        <>
          Connected to Eventbrite. Contact{' '}
          <a href={HELP_URL} style={{ textDecoration: 'underline' }} target="_blank" rel="noreferrer">
            Support
          </a>{' '}
          to disconnect.
        </>
      }
      isActive={!!currentOrganization?.show_connected_to_eventbrite}
    />
  );
}

export default EventbriteIntegrationCard;
