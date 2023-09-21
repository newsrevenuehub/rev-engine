import { useMutation } from '@tanstack/react-query';
import axios from 'ajax/axios';
import { GET_MAGIC_LINK } from 'ajax/endpoints';
import { AxiosError } from 'axios';
import { useConfigureAnalytics } from 'components/analytics';
import { TextField } from 'components/base';
import SystemNotification from 'components/common/SystemNotification';
import { ContributionPage } from 'hooks/useContributionPage';
import useSubdomain from 'hooks/useSubdomain';
import { useSnackbar } from 'notistack';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Confirmation, Content, Form, Subtitle, Title, Wrapper } from './PortalEntry.styled';

export type PortalFormValues = {
  email: string;
};

async function postMagicLink({ email, subdomain }: { email: string; subdomain: string }) {
  const result = await axios.post(GET_MAGIC_LINK, { email, subdomain });
  return result;
}

function PortalEntry({ page }: { page?: ContributionPage }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch
  } = useForm<PortalFormValues>();

  const { enqueueSnackbar } = useSnackbar();
  const [error, setError] = useState<{ email?: string[] }>({});
  const subdomain = useSubdomain();

  useConfigureAnalytics();

  const {
    mutate: getMagicLink,
    isLoading,
    isSuccess
  } = useMutation(
    ({ email }: PortalFormValues) => {
      return postMagicLink({ email, subdomain });
    },
    {
      onError: (error) => {
        if ((error as AxiosError).response?.status === 429) {
          setError({ email: ['Too many attempts. Try again in one minute.'] });
        } else if ((error as AxiosError).response?.data?.email) {
          setError((error as AxiosError).response?.data);
        } else {
          enqueueSnackbar('There’s been a problem sending your magic link. Please try again.', {
            persist: true,
            content: (key: string, message: string) => (
              <SystemNotification id={key} message={message} header="Error sending email" type="error" />
            )
          });
        }
      }
    }
  );

  const watchEmail = watch('email', '');
  const disabled = isLoading || !watchEmail;

  return (
    <Wrapper>
      <Content>
        <Title>Welcome to the {page?.revenue_program?.name ?? 'RevEngine'} Contributor Portal</Title>

        {isSuccess ? (
          <Confirmation>
            <h2>Email Sent!</h2>
            <p>
              An email has been sent to you containing your magic link. Click on your magic link to view your
              contributions.
            </p>
            <p>
              <br />
              (It's safe to close this tab)
            </p>
          </Confirmation>
        ) : (
          <>
            <Subtitle>
              Thank you for supporting our community. To access your contributions, enter the email used for
              contributions below and we’ll send you an email with a magic link.
            </Subtitle>
            <Form onSubmit={handleSubmit(getMagicLink as (data: PortalFormValues) => Promise<any>)}>
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
              />
              <Button type="submit" disabled={disabled} color="primaryDark" $customPage={!!page}>
                Send Magic Link
              </Button>
            </Form>
          </>
        )}
      </Content>
    </Wrapper>
  );
}

export default PortalEntry;
