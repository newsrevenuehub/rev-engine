import ChevronRightIcon from '@material-ui/icons/ChevronRight';
import PropTypes, { InferProps } from 'prop-types';
import StripeLogo from 'assets/icons/stripeLogo.svg';
import { Button, Modal, OffscreenText, StepperDots } from 'components/base';
import ConnectStripeNeedHelpCta from './ConnectStripeNeedHelpCTA';
import { Description, Heading, LaterButton, Root } from './ConnectStripeModal.styled';

const ConnectStripeModalPropTypes = {
  onClose: PropTypes.func.isRequired,
  onConnectStripe: PropTypes.func.isRequired,
  open: PropTypes.bool.isRequired
};

export interface ConnectStripeModalProps extends InferProps<typeof ConnectStripeModalPropTypes> {
  onClose: () => void;
  onConnectStripe: () => void;
}

export function ConnectStripeModal({ onClose, onConnectStripe, open }: ConnectStripeModalProps) {
  return (
    <Modal open={open} aria-labelledby="connect-stripe-modal-header">
      <Root data-testid="connect-stripe-modal">
        <OffscreenText>Step 2 of 2</OffscreenText>
        <img src={StripeLogo} alt="Stripe" />
        <Heading id="connect-stripe-modal-header">Set Up Payment Processor</Heading>
        <Description>
          To accept contributions, you'll need to set up a payment processor. We use Stripe because it's speedy and
          secure. Create and connect to a Stripe account in one easy step.
        </Description>
        <ConnectStripeNeedHelpCta />
        <Button fullWidth data-testid="connect-stripe-modal-button" onClick={onConnectStripe} size="extraLarge">
          Connect Now
        </Button>
        <LaterButton color="text" fullWidth onClick={onClose} size="extraLarge">
          I'll connect to Stripe later
          <ChevronRightIcon />
        </LaterButton>
        <StepperDots aria-hidden activeStep={1} steps={2} />
      </Root>
    </Modal>
  );
}

ConnectStripeModal.propTypes = ConnectStripeModalPropTypes;
export default ConnectStripeModal;
