import { PropsWithChildren } from 'react';
import * as Sentry from '@sentry/react';

import * as S from '../../elements/buttons/Button.styled';
import * as ErrorS from './ChunkErrorFallback.styled';

import logout from 'components/authentication/logout';

const ChunkErrorFallback = () => {
  return (
    <>
      <ErrorS.ErrorWrapper>
        <ErrorS.ErrorHeading layout>
          <h2>We've encountered a problem!</h2>
          <h4>Click below to reload the page</h4>
        </ErrorS.ErrorHeading>
        <S.Button
          onClick={() => {
            window.location.reload();
          }}
        >
          Refresh
        </S.Button>

        <ErrorS.Logout
          data-testid={'error-sign-out'}
          onClick={logout}
          whileHover={{ scale: 1.05, x: -3 }}
          whileTap={{ scale: 1, x: 0 }}
        >
          Sign out
        </ErrorS.Logout>
      </ErrorS.ErrorWrapper>
    </>
  );
};

const ChunkErrorBoundary = ({ children }: PropsWithChildren<Record<never, never>>) => {
  return <Sentry.ErrorBoundary fallback={ChunkErrorFallback}>{children}</Sentry.ErrorBoundary>;
};

export default ChunkErrorBoundary;
