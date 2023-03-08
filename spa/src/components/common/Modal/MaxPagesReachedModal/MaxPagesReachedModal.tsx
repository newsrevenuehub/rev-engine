import { Button, Modal, ModalFooter } from 'components/base';
import { HELP_URL, PRICING_URL } from 'constants/helperUrls';
import { EnginePlan } from 'hooks/useContributionPage';
import PropTypes, { InferProps } from 'prop-types';
import {
  BenefitsList,
  Card,
  CardHeader,
  CardHeaderHighlight,
  ModalContent,
  ModalHeader,
  ModalHeaderIcon,
  PlanLimit,
  PricingLink,
  Recommendation,
  RedEmphasis
} from './MaxPagesReachedModal.styled';

const planNames: Record<EnginePlan['name'], string> = {
  CORE: 'Core',
  FREE: 'Free',
  PLUS: 'Plus'
};

const MaxPagesReachedModalPropTypes = {
  currentPlan: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
  open: PropTypes.bool,
  recommendedPlan: PropTypes.string
};

export interface MaxPagesReachedModalProps extends InferProps<typeof MaxPagesReachedModalPropTypes> {
  currentPlan: EnginePlan['name'];
  onClose: () => void;
  recommendedPlan?: EnginePlan['name'];
}

export function MaxPagesReachedModal({
  currentPlan,
  onClose,
  open,
  recommendedPlan = 'CORE'
}: MaxPagesReachedModalProps) {
  const LooseButton = Button as any;

  return (
    <Modal open={!!open}>
      <ModalHeader icon={<ModalHeaderIcon />} onClose={onClose}>
        <strong>Max Pages Reached</strong>
      </ModalHeader>
      <ModalContent>
        <PlanLimit data-testid="plan-limit">
          You've reached the <RedEmphasis>maximum</RedEmphasis> number of pages for the {planNames[currentPlan]} tier.
        </PlanLimit>
        <Recommendation data-testid="recommendation">
          <strong>Want to create more pages?</strong> Check out {planNames[recommendedPlan]}.
        </Recommendation>
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
              <PricingLink href={PRICING_URL} target="_blank">
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
        <LooseButton color="primaryDark" component="a" href={HELP_URL} target="_blank">
          Upgrade
        </LooseButton>
      </ModalFooter>
    </Modal>
  );
}

MaxPagesReachedModal.propTypes = MaxPagesReachedModalPropTypes;
export default MaxPagesReachedModal;
