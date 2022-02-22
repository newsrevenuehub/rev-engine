import { createContext, useContext } from 'react';
import * as S from './ProviderConnect.styled';

// AJAX
import useRequest from 'hooks/useRequest';
import { USER } from 'ajax/endpoints';

// Context
import { useConnectContext } from 'components/Main';

// Deps
import { useAlert } from 'react-alert';

// Constants
import { LS_USER } from 'settings';
import { GENERIC_ERROR } from 'constants/textConstants';

// Children
import ConnectProcessing from 'components/connect/ConnectProcessing';
import StripeProvider from 'components/connect/stripe/StripeProvider';

const ProviderFetchContext = createContext();

function ProviderConnect() {
  const alert = useAlert();
  const requestUpdateUser = useRequest();
  const { updateDefaultPaymentProvider } = useConnectContext();

  const handleConnectSuccess = () => {
    requestUpdateUser(
      { method: 'GET', url: USER },
      {
        onSuccess: ({ data: user }) => {
          updateDefaultPaymentProvider(user);
          localStorage.setItem(LS_USER, JSON.stringify(user));
        },
        onFailure: (e) => alert.error(GENERIC_ERROR)
      }
    );
  };

  return (
    <ProviderFetchContext.Provider value={{ handleConnectSuccess }}>
      <S.ProviderConnect data-testid="provider-connect">
        <h2>To continue, please connect a payment provider</h2>
        <S.ProvidersList>
          <StripeProvider />
        </S.ProvidersList>
      </S.ProviderConnect>
    </ProviderFetchContext.Provider>
  );
}

export const useProviderFetchContext = () => useContext(ProviderFetchContext);

export default ProviderConnect;
