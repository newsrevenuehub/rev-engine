import { useState, useReducer } from 'react';
import * as S from './Verify.styled';
import { Link } from 'react-router-dom';

// AJAX
import axios from 'ajax/axios';
import { VERIFY_EMAIL_REQUEST_ENDPOINT } from 'ajax/endpoints';

import logo from 'assets/images/logo-nre.png';
import sendIcon from 'assets/icons/send.png';
import draftIcon from 'assets/icons/draft.png';
import readIcon from 'assets/icons/mark_read.png';

// Analytics
import { useConfigureAnalytics } from '../../analytics';
import { useUserDataProviderContext } from 'components/Main';

// State management
import fetchReducer, { initialState, FETCH_START, FETCH_SUCCESS, FETCH_FAILURE } from 'state/fetch-reducer';

const HELPEMAIL = `revenginesupport@fundjournalism.org`;
const Mailto = ({ mailto, label }) => {
  return (
    <Link
      to="#"
      onClick={(e) => {
        window.location.href = mailto;
        e.preventDefault();
      }}
    >
      {label}
    </Link>
  );
};

function Verify() {
  useConfigureAnalytics();
  const { userData } = useUserDataProviderContext();
  const [emailResent, setEmailResent] = useState(false);

  const [verifyState, dispatch] = useReducer(fetchReducer, initialState);

  const onSubmit = async () => {
    dispatch({ type: FETCH_START });
    try {
      const { data, status } = await axios.get(VERIFY_EMAIL_REQUEST_ENDPOINT);
      if (status === 200) {
        setEmailResent(true);
        dispatch({ type: FETCH_SUCCESS, payload: data });
      } else {
        dispatch({ type: FETCH_FAILURE, payload: data });
      }
    } catch (e) {
      dispatch({ type: FETCH_FAILURE, payload: e?.response?.data });
    }
  };

  const errorMessage = 'EFREGREG'; //verifyState?.errors?.detail;

  return (
    <S.Verify>
      <S.Logo src={logo} data-testid={'blue-logo'} />
      <S.Content>
        <S.Box>
          <S.Icon src={draftIcon} />
          <S.Icon src={sendIcon} />
          <S.Icon src={readIcon} />
          <S.Heading>Verify Your Email Address</S.Heading>
          <S.Subheading>
            To start using News Revenue Engine, please verify your email. We’ve sent a verification email to{' '}
            <span>{userData?.email}.</span>
          </S.Subheading>
          <S.Drm>Didn’t Receive an Email?</S.Drm>
          <S.Resendtext>If you haven’t received the email within a few minutes, please resend below.</S.Resendtext>
          <S.Button onClick={onSubmit} name="Resend Verification" disabled={emailResent}>
            Resend Verification
          </S.Button>
          <S.Help>
            <span>Questions?</span> Email us at <Mailto label={HELPEMAIL} mailto={`mailto:${HELPEMAIL}`} />
          </S.Help>
          {errorMessage ? <S.Message>{errorMessage}</S.Message> : null}
        </S.Box>
      </S.Content>
    </S.Verify>
  );
}

export default Verify;
