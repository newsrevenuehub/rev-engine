import { InfoOutlined } from '@material-ui/icons';
import { Button, Modal, ModalFooter, ModalHeader } from 'components/base';
import PropTypes, { InferProps } from 'prop-types';
import {
  BenefitsList,
  Card,
  CardHeader,
  CardHeaderHighlight,
  ModalContent,
  PlanLimit,
  PricingLink,
  RedEmphasis
} from './MaxPagesReachedModal.styled';

const MaxPagesReachedModalPropTypes = {
  currentPlan: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
  open: PropTypes.bool,
  recommendedPlan: PropTypes.string
};

export interface MaxPagesReachedModalProps extends InferProps<typeof MaxPagesReachedModalPropTypes> {
  onClose: () => void;
}

export function MaxPagesReachedModal({
  currentPlan,
  onClose,
  open,
  recommendedPlan = 'Core'
}: MaxPagesReachedModalProps) {
  const LooseButton = Button as any;

  return (
    <Modal open={!!open}>
      <ModalHeader icon={<InfoOutlined />} onClose={onClose}>
        <strong>Max Pages Reached</strong>
      </ModalHeader>
      <ModalContent>
        <PlanLimit data-testid="plan-limit">
          You've reached the <RedEmphasis>maximum</RedEmphasis> number of pages for the {currentPlan} tier.
        </PlanLimit>
        <p data-testid="recommendation">
          <strong>Want to create more pages?</strong> Check out {recommendedPlan}.
        </p>
        <Card>
          <CardHeader>
            <CardHeaderHighlight>Core Tier</CardHeaderHighlight>
          </CardHeader>
          <BenefitsList>
            <li>Mailchimp integration</li>
            <li>Branded receipts</li>
            <li>Branded contributor portal</li>
            <li>2 live checkout pages</li>
            <li>
              <PricingLink href="https://fundjournalism.org/pricing/" target="_blank">
                And more!
              </PricingLink>
            </li>
          </BenefitsList>
        </Card>
      </ModalContent>
      <ModalFooter>
        <LooseButton color="secondary" onClick={onClose}>
          Maybe Later
        </LooseButton>
        <LooseButton
          color="primaryDark"
          component="a"
          href="https://fundjournalism.org/news-revenue-engine-help/"
          target="_blank"
        >
          Upgrade
        </LooseButton>
      </ModalFooter>
    </Modal>
  );
}

MaxPagesReachedModal.propTypes = MaxPagesReachedModalPropTypes;
export default MaxPagesReachedModal;
