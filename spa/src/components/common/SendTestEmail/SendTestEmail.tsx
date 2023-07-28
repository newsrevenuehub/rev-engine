import { useMutation } from '@tanstack/react-query';
import axios from 'ajax/axios';
import { SEND_TEST_EMAIL } from 'ajax/endpoints';
import { Button } from 'components/base';
import PropTypes, { InferProps } from 'prop-types';
import { useAlert } from 'react-alert';
import { ButtonWrapper, Description, Label, Preview } from './SendTestEmail.styled';

export type SendTestEmailProps = InferProps<typeof SendTestEmailPropTypes>;

const SendTestEmail = ({ rpId, description }: SendTestEmailProps) => {
  const alert = useAlert();

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
        alert.info('Sending test email. Check your inbox.');
      },
      onError: () => {
        alert.error('Error sending test email');
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
