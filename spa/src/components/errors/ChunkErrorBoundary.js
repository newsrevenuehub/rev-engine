import React from 'react';
import * as Sentry from '@sentry/react';

import * as S from '../../elements/buttons/Button.styled';
import * as ErrorS from './ErrorFallback.styled';

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
      </ErrorS.ErrorWrapper>
    </>
  );
};

const ChunkErrorBoundary = (props) => {
  return <Sentry.ErrorBoundary fallback={ChunkErrorFallback}>{props.children}</Sentry.ErrorBoundary>;
};

export default ChunkErrorBoundary;
