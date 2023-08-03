import { useMutation } from '@tanstack/react-query';
import axios from 'ajax/axios';
import { SEND_TEST_EMAIL } from 'ajax/endpoints';
import { Button } from 'components/base';
import PropTypes, { InferProps } from 'prop-types';
import { useSnackbar } from 'notistack';
import { ButtonWrapper, Description, Label, Preview } from './SendTestEmail.styled';
import SystemNotification from '../SystemNotification';

export type SendTestEmailProps = InferProps<typeof SendTestEmailPropTypes>;

const SendTestEmail = ({ rpId, description }: SendTestEmailProps) => {
  const { enqueueSnackbar } = useSnackbar();

  async function postSendTestEmail(email_name?: string, revenue_program?: number) {
    const result = await axios.post(SEND_TEST_EMAIL, {
      email_name,
      revenue_program
    });
    return result;
  }

  const { mutate: sendTestEmail } = useMutation(
    ({ email_name, rpId }: { email_name?: string; rpId?: number }) => {
      return postSendTestEmail(email_name, rpId);
    },
    {
      onSuccess: () => {
        enqueueSnackbar('Sending test email. Please check your inbox.', {
          persist: true,
          content: (key: string, message: string) => (
            <SystemNotification id={key} message={message} header="Sending Email" type="info" />
          )
        });
      },
      onError: () => {
        enqueueSnackbar('There’s been a problem sending test email. Please try again.', {
          persist: true,
          content: (key: string, message: string) => (
            <SystemNotification id={key} message={message} header="Error sending test email" type="error" />
          )
        });
      }
    }
  );

  const handleSendTestEmail = (email_name: string) => () => {
    sendTestEmail({ email_name, rpId });
  };

  return (
    <div data-testid="send-test-email">
      <Label>Emails</Label>
      <Description>{description}</Description>
      <Preview>Preview sample emails</Preview>
      <ButtonWrapper>
        <Button color="secondary" onClick={handleSendTestEmail('receipt')}>
          Send Receipt
        </Button>
        <Button color="secondary" onClick={handleSendTestEmail('reminder')}>
          Send Reminder
        </Button>
        <Button color="secondary" onClick={handleSendTestEmail('magic_link')}>
          Send Magic link
        </Button>
      </ButtonWrapper>
    </div>
  );
};

const SendTestEmailPropTypes = {
  rpId: PropTypes.number.isRequired,
  description: PropTypes.node.isRequired
};

SendTestEmail.propTypes = SendTestEmailPropTypes;

export default SendTestEmail;
