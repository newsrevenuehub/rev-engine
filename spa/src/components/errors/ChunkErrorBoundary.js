import React, { Fragment, useState, useEffect } from 'react';
import * as Sentry from '@sentry/react';

import Button from 'elements/buttons/Button';
import * as S from '../../elements/buttons/Button.styled';
import * as ErrorS from './ErrorFallback.styled';

const ChunkErrorFallback = (error, componentStack, handleReset, resetError) => {
  const chunkFailedMessage = /Loading chunk [\d]+ failed/;

  if (error?.message && chunkFailedMessage.test(error.message)) {
    resetError();
  } else {
    return (
      <Fragment>
        <ErrorS.ErrorWrapper>
          <ErrorS.ErrorHeading layout>
            <h2>You have encountered an error</h2>
          </ErrorS.ErrorHeading>
          <ErrorS.ErrorMessage>
            <div>{error.toString()}</div>
          </ErrorS.ErrorMessage>
          <ErrorS.ErrorStack>
            <div>{componentStack}</div>
          </ErrorS.ErrorStack>
          <S.Button>
            <Button
              onClick={() => {
                handleReset('An error has occurred');
                resetError();
              }}
            >
              Click here to reload this page
            </Button>
          </S.Button>
        </ErrorS.ErrorWrapper>
      </Fragment>
    );
  }
};

const ChunkErrorBoundary = (props) => {
  const [message, setMessage] = useState();

  const handleReset = (newMessage) => {
    setMessage(newMessage);
  };

  return (
    <Sentry.ErrorBoundary
      fallback={({ error, componentStack, resetError }) =>
        ChunkErrorFallback(error, componentStack, handleReset, resetError)
      }
    >
      {props.children}
    </Sentry.ErrorBoundary>
  );
};

export default ChunkErrorBoundary;
