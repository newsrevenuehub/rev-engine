import { useState, useReducer } from 'react';
import * as S from './Verify.styled';
import { useLocation, Link } from 'react-router-dom';

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
  const { state: routedState } = useLocation();
  useConfigureAnalytics();

  const { userData } = useUserDataProviderContext();

  const [verifyState, dispatch] = useReducer(fetchReducer, initialState);

  //console.log(user);
  const onSubmitVerify = async () => {
    dispatch({ type: FETCH_START });
    try {
      const { data, status } = await axios.get(VERIFY_EMAIL_REQUEST_ENDPOINT);
      if (status === 200 && data.detail === 'success') {
      }
      dispatch({ type: FETCH_SUCCESS });
    } catch (e) {
      dispatch({ type: FETCH_FAILURE, payload: e?.response?.data });
    }
  };

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
            To start using News Revenue Engine, please verify  your email. We’ve sent a verification email to{' '}
            <span>{routedState?.email}.</span>
          </S.Subheading>
          <S.Drm>Didn’t Receive an Email?</S.Drm>
          <S.Resendtext>If you haven’t received the email within a few minutes, please resend below.</S.Resendtext>
          <S.Button onClick={onSubmitVerify}>Resend Verification</S.Button>
          <S.Help>
            <span>Questions?</span> Email us at <Mailto label={HELPEMAIL} mailto={`mailto:${HELPEMAIL}`} />
          </S.Help>
        </S.Box>
      </S.Content>
    </S.Verify>
  );
}

export default Verify;
