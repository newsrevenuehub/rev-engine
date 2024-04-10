import { usePortalAuthContext } from 'hooks/usePortalAuth';
import { useEffect, useMemo, useState } from 'react';
import { Redirect, useLocation } from 'react-router-dom';
import { PORTAL } from 'routes';
import { GlobalLoading } from 'components/common/GlobalLoading';
import TokenError from './TokenError';

export function TokenVerification() {
  const { search } = useLocation();
  const { email, token } = useMemo(() => {
    const params = new URLSearchParams(search);

    return { email: params.get('email'), token: params.get('token') };
  }, [search]);
  const [error, setError] = useState<Error | undefined>(
    !email || !token ? new Error('Missing querystring params') : undefined
  );
  const { contributor, verifyToken } = usePortalAuthContext();

  useEffect(() => {
    async function run() {
      try {
        await verifyToken!(email!, token!);
      } catch (error) {
        setError(error as Error);
      }
    }

    if (email && token && verifyToken) {
      run();
    }
  }, [email, token, verifyToken]);

  if (contributor) {
    return <Redirect to={PORTAL.CONTRIBUTIONS} />;
  }

  if (error) {
    return <TokenError />;
  }

  return <GlobalLoading />;
}

export default TokenVerification;
