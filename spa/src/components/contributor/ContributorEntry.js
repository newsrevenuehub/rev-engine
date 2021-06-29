import { useState } from 'react';
import * as S from './ContributorEntry.styled';

// Icons
import { faExclamationCircle } from '@fortawesome/free-solid-svg-icons';

// AJAX
import axios from 'ajax/axios';
import { GET_MAGIC_LINK } from 'ajax/endpoints';

// Children
import Input from 'elements/inputs/Input';

function ContributorEntry() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState('');
  const [errors, setErrors] = useState({});

  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleSendMagicLink = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await axios.post(GET_MAGIC_LINK, { email });
      if (response.status === 200) setShowConfirmation(true);
    } catch (e) {
      if (e?.response?.data) {
        setErrors(e.response.data);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <S.ContributorEntry>
      <S.ContentWrapper>
        <S.Title>Welcome to the RevEngine contributor portal</S.Title>
        {showConfirmation ? (
          <S.Confirmation>
            <p>If you're in our system, an email has been sent to you containing your magic link</p>
            <p>Click on your magic link to view your contributions</p>
            <p>(It's safe to close this tab)</p>
          </S.Confirmation>
        ) : (
          <S.EmailForm>
            <S.InputWrapper>
              <Input
                label="Enter the email address you used to make a conribution"
                value={email}
                type="email"
                onChange={(e) => setEmail(e.target.value)}
                errors={errors.email}
              />
            </S.InputWrapper>
            <S.MagicLinkButton onClick={handleSendMagicLink} disabled={loading}>
              Send Magic Link
              <span role="img" aria-label="magic wand">
                🪄
              </span>
            </S.MagicLinkButton>
          </S.EmailForm>
        )}
      </S.ContentWrapper>
    </S.ContributorEntry>
  );
}

export default ContributorEntry;
