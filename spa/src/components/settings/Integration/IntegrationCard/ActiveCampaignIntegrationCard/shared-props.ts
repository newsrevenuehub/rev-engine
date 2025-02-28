import ActiveCampaignLogo from 'assets/images/activecampaign.svg';
import { IntegrationCardProps } from '../IntegrationCard';

/**
 * Common display props used on both the integration card and its modal.
 */
export const cardProps: Pick<IntegrationCardProps, 'description' | 'image' | 'isRequired' | 'site' | 'title'> = {
  description: 'Connect to ActiveCampaign to create segments and powerful automations to propel campaigns.',
  image: ActiveCampaignLogo,
  isRequired: false,
  site: { label: 'activecampaign.com', url: 'https://activecampaign.com' },
  title: 'ActiveCampaign'
};
