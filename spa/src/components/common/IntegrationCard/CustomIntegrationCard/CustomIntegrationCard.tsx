import { Link } from 'components/base';
import { HELP_URL } from 'constants/helperUrls';
import useUser from 'hooks/useUser';
import PropTypes, { InferProps } from 'prop-types';
import IntegrationCard from '../IntegrationCard';

export interface CustomIntegrationCardProps extends InferProps<typeof CustomIntegrationCardPropTypes> {
  flag:
    | 'show_connected_to_digestbuilder'
    | 'show_connected_to_eventbrite'
    | 'show_connected_to_newspack'
    | 'show_connected_to_google_analytics'
    | 'show_connected_to_salesforce';
}

export function CustomIntegrationCard({
  image,
  title,
  site,
  toggleLabelOverride,
  toggleTooltipMessageOverride,
  description,
  flag
}: CustomIntegrationCardProps) {
  const { user } = useUser();
  const currentOrganization = user?.organizations?.length === 1 ? user?.organizations?.[0] : undefined;

  return (
    <IntegrationCard
      image={image}
      title={title}
      isRequired={false}
      site={site}
      description={description}
      toggleLabel={
        toggleLabelOverride ?? (
          <>
            Contact{' '}
            <Link href={HELP_URL} target="_blank">
              Support
            </Link>{' '}
            to Connect
          </>
        )
      }
      toggleTooltipMessage={toggleTooltipMessageOverride ?? `Contact our Support Staff to integrate with ${title}`}
      disabled
      toggleConnectedTooltipMessage={
        <>
          Connected to {title}. Contact{' '}
          <Link href={HELP_URL} target="_blank">
            Support
          </Link>{' '}
          to disconnect.
        </>
      }
      isActive={!!currentOrganization?.[flag]}
    />
  );
}

const CustomIntegrationCardPropTypes = {
  image: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  site: PropTypes.shape({
    label: PropTypes.string.isRequired,
    url: PropTypes.string.isRequired
  }).isRequired,
  toggleLabelOverride: PropTypes.node,
  toggleTooltipMessageOverride: PropTypes.string,
  description: PropTypes.string.isRequired,
  flag: PropTypes.string.isRequired
};

CustomIntegrationCard.propTypes = CustomIntegrationCardPropTypes;

export default CustomIntegrationCard;
