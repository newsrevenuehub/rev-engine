import { useMutation } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import Axios from 'ajax/axios';
import { SEND_TEST_EMAIL } from 'ajax/endpoints';
import SystemNotification from 'components/common/SystemNotification';

export type TestEmailName = 'magic_link' | 'receipt' | 'reminder';

async function sendTestEmail(revenue_program: number, email_name: TestEmailName) {
  return (await Axios.post(SEND_TEST_EMAIL, { email_name, revenue_program })).data;
}

export function useTestEmails() {
  const { enqueueSnackbar } = useSnackbar();

  // Using useMutation here to take advantage of its retry mechanism.

  const { mutate } = useMutation(
    ({ emailName, revenueProgramId }: { emailName: TestEmailName; revenueProgramId: number }) =>
      sendTestEmail(revenueProgramId, emailName),
    {
      onError() {
        enqueueSnackbar("There's been a problem sending the test email. Please try again.", {
          persist: true,
          content: (key: string, message: string) => (
            <SystemNotification id={key} message={message} header="Error sending test email" type="error" />
          )
        });
      },
      onSuccess() {
        enqueueSnackbar('A test email has been sent. Please allow several minutes for the email to arrive.', {
          persist: true,
          content: (key: string, message: string) => (
            <SystemNotification id={key} message={message} header="Test Email Sent" type="success" />
          )
        });
      }
    }
  );

  return { sendTestEmail: mutate };
}
