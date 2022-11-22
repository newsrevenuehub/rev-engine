import { NeedHelpCta, NeedHelpSpan, StripeFAQ } from './ConnectStripeNeedHelpCTA.styled';
import { CONNECT_STRIPE_FAQ_LINK } from 'constants/textConstants';

export default function ConnectStripeNeedHelpCta() {
  return (
    <NeedHelpCta>
      <NeedHelpSpan>Need help?</NeedHelpSpan> Check out our{' '}
      <StripeFAQ href={CONNECT_STRIPE_FAQ_LINK} target="_blank">
        FAQ
      </StripeFAQ>
      .
    </NeedHelpCta>
  );
}
