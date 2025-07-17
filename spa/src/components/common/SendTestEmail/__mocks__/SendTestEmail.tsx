import { SendTestEmailProps } from '../SendTestEmail';

const SendTestEmail = ({ rpId, description }: SendTestEmailProps) => {
  return (
    <div data-testid="mock-send-test-email" data-rpid={rpId}>
      {description}
    </div>
  );
};

export default SendTestEmail;
