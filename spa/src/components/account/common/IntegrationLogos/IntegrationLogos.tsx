import ActiveCampaignLogo from 'assets/images/account/integration-logos/activecampaign.svg';
import StripeLogo from 'assets/images/account/integration-logos/stripe.svg';
import DigestbuilderLogo from 'assets/images/account/integration-logos/digestbuilder.png';
import EventbriteLogo from 'assets/images/account/integration-logos/eventbrite.png';
import MailchimpLogo from 'assets/images/account/integration-logos/mailchimp.svg';
import NewspackLogo from 'assets/images/account/integration-logos/newspack.png';
import SalesforceLogo from 'assets/images/account/integration-logos/salesforce.svg';
import { Heading, Logo, Logos, Root } from './IntegrationLogos.styled';

// Exported for testing only.
// Heights vary here so that logos visually look the same size.

export const logos = [
  { height: 30, image: StripeLogo, name: 'Stripe' },
  { height: 40, image: SalesforceLogo, name: 'Salesforce' },
  { height: 20, image: DigestbuilderLogo, name: 'Digestbuilder' },
  { height: 25, image: NewspackLogo, name: 'Newspack' },
  { height: 30, image: MailchimpLogo, name: 'Mailchimp' },
  { height: 15, image: ActiveCampaignLogo, name: 'ActiveCampaign' },
  { height: 20, image: EventbriteLogo, name: 'Eventbrite' }
];

export function IntegrationLogos() {
  return (
    <Root data-testid="company-icons">
      <Heading>We Work With</Heading>
      <Logos>
        {logos.map(({ height, name, image }) => (
          <Logo alt={name} key={name} src={image} style={{ height }} />
        ))}
      </Logos>
    </Root>
  );
}

export default IntegrationLogos;
