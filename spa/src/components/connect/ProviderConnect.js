import { useState, createContext, useContext } from 'react';
import * as S from './ProviderConnect.styled';

// Children
import ConnectProcessing from 'components/connect/ConnectProcessing';
import StripeProvider from 'components/connect/stripe/StripeProvider';

const ProviderFetchContext = createContext();

function ProviderConnect() {
  const [away, setAway] = useState(false);

  return (
    <ProviderFetchContext.Provider value={{ away, setAway }}>
      <S.ProviderConnect>
        <h2>To continue, please connect a payment provider</h2>
        <S.ProvidersList>
          <StripeProvider />
        </S.ProvidersList>
        {away && <ConnectProcessing />}
      </S.ProviderConnect>
    </ProviderFetchContext.Provider>
  );
}

export const useProviderFetchContext = () => useContext(ProviderFetchContext);

export default ProviderConnect;
