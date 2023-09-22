import { useConfigureAnalytics } from 'components/analytics';
import { TextField } from 'components/base';
import usePortal from 'hooks/usePortal';
import { Controller, useForm } from 'react-hook-form';
import { Button, Confirmation, Content, Form, Subtitle, Title, Wrapper } from './PortalEntry.styled';

export type PortalFormValues = {
  email: string;
};

function PortalEntry() {
  const {
    control,
    handleSubmit,
    formState: { errors },
    watch
  } = useForm<PortalFormValues>({ defaultValues: { email: '' } });

  const { page, sendMagicLink, magicLinkError, magicLinkIsLoading, magicLinkIsSuccess } = usePortal();

  useConfigureAnalytics();

  const watchEmail = watch('email', '');
  const disabled = magicLinkIsLoading || !watchEmail;

  const onSubmit = (formData: PortalFormValues) => {
    sendMagicLink(formData);
  };

  return (
    <Wrapper>
      <Content>
        <Title>Welcome to the {page?.revenue_program?.name ?? 'RevEngine'} Contributor Portal</Title>
        {magicLinkIsSuccess ? (
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
            <Form onSubmit={handleSubmit(onSubmit)}>
              <Controller
                name="email"
                control={control}
                rules={{
                  pattern: {
                    value: /\S+@\S+\.\S+/,
                    message: 'Please enter a valid email address'
                  }
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    id="email"
                    label="Email Address"
                    placeholder="support@email.com"
                    helperText={errors.email?.message || magicLinkError?.email?.join('. ')}
                    error={!!errors.email || !!magicLinkError?.email}
                  />
                )}
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
