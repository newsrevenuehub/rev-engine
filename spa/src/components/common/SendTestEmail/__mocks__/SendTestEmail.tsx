import { SendTestEmailProps } from '../SendTestEmail';

const SendTestEmail = ({ rpId, description, editable }: SendTestEmailProps) => {
  return (
    <div data-testid="mock-send-test-email" data-rpid={rpId} data-editable={editable}>
      {description}
    </div>
  );
};

export default SendTestEmail;
