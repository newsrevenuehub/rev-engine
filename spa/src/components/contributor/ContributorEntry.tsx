import { useState } from 'react';
import * as S from './ContributorEntry.styled';

import { GENERIC_ERROR_WITH_SUPPORT_INFO } from 'constants/textConstants';
import { useAlert } from 'react-alert';

import useSubdomain from 'hooks/useSubdomain';

// AJAX
import axios from 'ajax/axios';
import { GET_MAGIC_LINK } from 'ajax/endpoints';

// Children
import Input from 'elements/inputs/Input';

// Analytics
import { useConfigureAnalytics } from 'components/analytics';
import { AxiosError } from 'axios';
import { ContributionPage } from 'hooks/useContributionPage';

function ContributorEntry({ page }: { page?: ContributionPage }) {
  const alert = useAlert();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string[] }>({});

  const [showConfirmation, setShowConfirmation] = useState(false);
  const subdomain = useSubdomain();

  useConfigureAnalytics();

  const handleSendMagicLink = async (event: React.MouseEvent<HTMLElement>) => {
    event.preventDefault();
    setLoading(true);
    setErrors({});
    try {
      const response = await axios.post(GET_MAGIC_LINK, { email, subdomain });
      if (response.status === 200) setShowConfirmation(true);
    } catch (error) {
      if ((error as AxiosError).response?.status === 429) {
        setErrors({ email: ['Too many attempts. Try again in one minute.'] });
      } else if ((error as AxiosError).response?.data?.email) {
        setErrors((error as AxiosError).response?.data);
      } else {
        alert.error(GENERIC_ERROR_WITH_SUPPORT_INFO);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <S.ContributorEntry>
      <S.ContentWrapper>
        <S.Title>Welcome to the {page?.revenue_program?.name ?? 'RevEngine'} contributor portal</S.Title>
        {showConfirmation ? (
          <S.Confirmation>
            <p>An email has been sent to you containing your magic link</p>
            <p>Click on your magic link to view your contributions</p>
            <p>(It's safe to close this tab)</p>
          </S.Confirmation>
        ) : (
          <S.EmailForm>
            <S.InputWrapper>
              <Input
                label="Enter the email address you used to make a contribution"
                value={email}
                type="email"
                onChange={(e) => setEmail(e.target.value)}
                errors={errors.email}
                data-testid="magic-link-email-input"
              />
            </S.InputWrapper>
            <S.MagicLinkButton onClick={handleSendMagicLink} disabled={loading} data-testid="magic-link-email-button">
              Send Magic Link
            </S.MagicLinkButton>
          </S.EmailForm>
        )}
      </S.ContentWrapper>
    </S.ContributorEntry>
  );
}

export default ContributorEntry;
