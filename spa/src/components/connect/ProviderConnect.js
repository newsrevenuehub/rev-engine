import * as S from './ProviderConnect.styled';

import StripeProvider from 'components/connect/stripe/StripeProvider';

function ProviderConnect() {
  return (
    <S.ProviderConnect data-testid="provider-connect">
      <S.ProvidersList>
        <StripeProvider />
      </S.ProvidersList>
    </S.ProviderConnect>
  );
}

export default ProviderConnect;
