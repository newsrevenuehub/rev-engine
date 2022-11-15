import * as S from './ConnectStripeNeedHelpCTA.styled';
import { CONNECT_STRIPE_FAQ_LINK } from 'constants/textConstants';

export default function ConnectStripeNeedHelpCta() {
  return (
    <S.NeedHelpCta>
      <S.NeedHelpSpan>Need help?</S.NeedHelpSpan> Check out our{' '}
      <S.StripeFAQ href={CONNECT_STRIPE_FAQ_LINK} target="_blank">
        FAQ
      </S.StripeFAQ>
      .
    </S.NeedHelpCta>
  );
}
