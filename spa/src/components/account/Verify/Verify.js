import * as S from './Verify.styled';
import { useLocation, Link } from 'react-router-dom';

import logo from 'assets/images/logo-nre.png';
import sendIcon from 'assets/icons/send.png';
import draftIcon from 'assets/icons/draft.png';
import readIcon from 'assets/icons/mark_read.png';

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

function Verify({ onSuccess, message }) {
  const { state: routedState } = useLocation();

  console.log(routedState);
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
          <S.Button>Resend Verification</S.Button>
          <S.Help>
            <span>Questions?</span> Email us at{' '}
            <Mailto label="emailaddress@fundjournalism.org" mailto="mailto:emailaddress@fundjournalism.org" />
          </S.Help>
        </S.Box>
      </S.Content>
    </S.Verify>
  );
}

export default Verify;
