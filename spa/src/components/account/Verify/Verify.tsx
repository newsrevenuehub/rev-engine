import Drafts from '@material-design-icons/svg/outlined/drafts.svg?react';
import MarkEmailRead from '@material-design-icons/svg/outlined/mark_email_read.svg?react';
import Send from '@material-design-icons/svg/outlined/send.svg?react';
import { useState, useReducer, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'ajax/axios';
import { VERIFY_EMAIL_REQUEST_ENDPOINT } from 'ajax/endpoints';
import { Button, Link } from 'components/base';
import { useConfigureAnalytics } from 'components/analytics';
import PageTitle from 'elements/PageTitle';
import useUser from 'hooks/useUser';
import fetchReducer, { initialState, FETCH_START, FETCH_SUCCESS, FETCH_FAILURE } from 'state/fetch-reducer';
import { Box, Footer, Heading, Icons, Logo, MainText, Message, Root, SmallerText, Subheading } from './Verify.styled';
import logo from 'assets/images/nre-logo-blue.svg';

import {
  VERIFIED_RESULTS_ACCEPTED_VALUES,
  VERIFIED_HELP_EMAIL,
  RESEND_VERIFICATION_SUCCESS_TEXT
} from 'constants/textConstants';

function Verify() {
  useConfigureAnalytics();
  const { user } = useUser();
  const [emailResent, setEmailResent] = useState(false);
  const [verifyState, dispatch] = useReducer(fetchReducer, initialState);
  const { search } = useLocation();
  const result = useMemo(() => new URLSearchParams(search), [search]).get('result');

  const handleClick = async () => {
    dispatch({ type: FETCH_START });
    try {
      const { data, status } = await axios.get(VERIFY_EMAIL_REQUEST_ENDPOINT);

      if (status === 200) {
        setEmailResent(true);
        dispatch({ type: FETCH_SUCCESS, payload: data });
      } else {
        dispatch({ type: FETCH_FAILURE, payload: data });
      }
    } catch (error) {
      dispatch({ type: FETCH_FAILURE, payload: (error as any).response?.data });
    }
  };

  const verifyMessage = useMemo(() => {
    if (emailResent) {
      return <Message $isSuccess>{RESEND_VERIFICATION_SUCCESS_TEXT}</Message>;
    }
    if (verifyState?.errors?.detail) {
      return <Message>{verifyState?.errors?.detail}</Message>;
    }
    if (result && VERIFIED_RESULTS_ACCEPTED_VALUES.includes(result)) {
      return <Message>{result}</Message>;
    }
  }, [verifyState, result, emailResent]);

  return (
    <Root>
      <PageTitle title="Verify Your Email Address" />
      <Logo src={logo} data-testid="blue-logo" alt="News Revenue Engine" />
      <Box>
        <Icons>
          <Send />
          <Drafts />
          <MarkEmailRead />
        </Icons>
        <Heading>Verify Your Email Address</Heading>
        <MainText>
          To start using News Revenue Engine, please verify your email. We've sent a verification email to{' '}
          <strong>{user?.email}</strong>.
        </MainText>
        <Subheading>Didn't Receive an Email?</Subheading>
        <SmallerText>If you haven't received the email within a few minutes, please resend below.</SmallerText>
        <Button disabled={emailResent} onClick={handleClick}>
          Resend Verification
        </Button>
        <Footer>
          <strong>Questions?</strong> Email us at{' '}
          <Link href={`mailto:${VERIFIED_HELP_EMAIL}`}>{VERIFIED_HELP_EMAIL}</Link>.
        </Footer>
        {verifyMessage}
      </Box>
    </Root>
  );
}

export default Verify;
