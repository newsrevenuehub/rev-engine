import axios from 'ajax/axios';
import { GET_MAGIC_LINK } from 'ajax/endpoints';
import { ReactComponent as NRELogo } from 'assets/images/nre-logo-yellow.svg';
import { AxiosError } from 'axios';
import { useConfigureAnalytics } from 'components/analytics';
import { TextField } from 'components/base';
import { GENERIC_ERROR_WITH_SUPPORT_INFO } from 'constants/textConstants';
import { ContributionPage } from 'hooks/useContributionPage';
import useSubdomain from 'hooks/useSubdomain';
import { useState } from 'react';
import { useAlert } from 'react-alert';
import { useForm } from 'react-hook-form';
import { Confirmation, Content, Form, PoweredBy, Subtitle, Title, Wrapper, Button } from './PortalEntry.styled';

export type PortalFormValues = {
  email: string;
};

function PortalEntry({ page }: { page?: ContributionPage }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch
  } = useForm<PortalFormValues>();

  const alert = useAlert();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ email?: string[] }>({});

  const watchEmail = watch('email', '');
  const disabled = loading || !watchEmail;

  const [showConfirmation, setShowConfirmation] = useState(false);
  const subdomain = useSubdomain();

  useConfigureAnalytics();

  const handleSendMagicLink = async ({ email }: PortalFormValues) => {
    setLoading(true);
    setError({});
    try {
      const response = await axios.post(GET_MAGIC_LINK, { email, subdomain });
      if (response.status === 200) setShowConfirmation(true);
    } catch (error) {
      if ((error as AxiosError).response?.status === 429) {
        setError({ email: ['Too many attempts. Try again in one minute.'] });
      } else if ((error as AxiosError).response?.data?.email) {
        setError((error as AxiosError).response?.data);
      } else {
        alert.error(GENERIC_ERROR_WITH_SUPPORT_INFO);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Wrapper>
      <Content>
        <Title>Welcome to the {page?.revenue_program?.name ?? 'RevEngine'} Contributor Portal</Title>

        {showConfirmation ? (
          <Confirmation>
            <p>An email has been sent to you containing your magic link</p>
            <p>Click on your magic link to view your contributions</p>
            <p>(It's safe to close this tab)</p>
          </Confirmation>
        ) : (
          <>
            <Subtitle>
              Thank you for supporting our community. To access your contributions, enter the email used for
              contributions below and we’ll send you an email with a magic link.
            </Subtitle>
            <Form onSubmit={handleSubmit(handleSendMagicLink)}>
              <TextField
                {...register('email', {
                  pattern: {
                    value: /\S+@\S+\.\S+/,
                    message: 'Please enter a valid email address'
                  }
                })}
                label="Email Address"
                placeholder="support@email.com"
                helperText={errors.email?.message || error?.email?.join('. ')}
                error={!!errors.email || !!error?.email}
                data-testid="magic-link-email-input"
              />
              <Button type="submit" disabled={disabled} color="primaryDark">
                Send Magic Link
              </Button>
            </Form>
          </>
        )}
      </Content>
      <PoweredBy>
        <span>Powered by</span>
        <NRELogo style={{ width: 145 }} />
      </PoweredBy>
    </Wrapper>
  );
}

export default PortalEntry;
