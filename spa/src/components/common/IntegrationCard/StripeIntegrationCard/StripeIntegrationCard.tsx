import StripeLogo from 'assets/images/stripe.png';
import { HELP_URL } from 'constants/helperUrls';
import useConnectStripeAccount from 'hooks/useConnectStripeAccount';
import { Link } from 'components/base';
import IntegrationCard from '../IntegrationCard';

export function StripeIntegrationCard() {
  const { requiresVerification, sendUserToStripe } = useConnectStripeAccount();

  return (
    <IntegrationCard
      image={StripeLogo}
      title="Stripe"
      isRequired
      site={{
        label: 'stripe.com',
        url: 'https://www.stripe.com'
      }}
      description="A simple way to accept payments online."
      disabled={false}
      toggleConnectedTooltipMessage={
        <>
          Connected to Stripe. Contact{' '}
          <Link href={HELP_URL} target="_blank">
            Support
          </Link>{' '}
          to disconnect.
        </>
      }
      isActive={!requiresVerification}
      onChange={requiresVerification ? sendUserToStripe : undefined}
    />
  );
}

export default StripeIntegrationCard;
