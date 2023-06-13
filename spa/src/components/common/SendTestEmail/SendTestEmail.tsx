import { useMutation } from '@tanstack/react-query';
import axios from 'ajax/axios';
import { SEND_TEST_EMAIL } from 'ajax/endpoints';
import { Button } from 'components/base';
import useUser from 'hooks/useUser';
import PropTypes, { InferProps } from 'prop-types';
import { useAlert } from 'react-alert';
import { getUserRole } from 'utilities/getUserRole';
import { ButtonWrapper, Flex, Label } from './SendTestEmail.styled';

type SendTestEmailProps = InferProps<typeof SendTestEmailPropTypes>;

const SendTestEmail = ({ rpId }: SendTestEmailProps) => {
  const alert = useAlert();
  const { user } = useUser();
  const { isHubAdmin, isSuperUser } = getUserRole(user);

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

  if (!(isHubAdmin || isSuperUser)) return null;

  return (
    <Flex>
      <Label>Test email</Label>
      <ButtonWrapper>
        <Button onClick={handleSendTestEmail('receipt')}>Receipt</Button>
        <Button onClick={handleSendTestEmail('reminder')}>Reminder</Button>
        <Button onClick={handleSendTestEmail('magic_link')}>Magic link</Button>
      </ButtonWrapper>
    </Flex>
  );
};

const SendTestEmailPropTypes = {
  rpId: PropTypes.number.isRequired
};

SendTestEmail.propTypes = SendTestEmailPropTypes;

export default SendTestEmail;
