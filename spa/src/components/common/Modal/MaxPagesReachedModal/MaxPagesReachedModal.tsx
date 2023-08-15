import PropTypes, { InferProps } from 'prop-types';
import { Link } from 'react-router-dom';
import { Button, LinkButton, Modal, ModalFooter } from 'components/base';
import { CORE_UPGRADE_URL, PRICING_URL } from 'constants/helperUrls';
import { SELF_UPGRADE_ACCESS_FLAG_NAME } from 'constants/featureFlagConstants';
import { PLAN_LABELS, PLAN_NAMES } from 'constants/orgPlanConstants';
import { EnginePlan } from 'hooks/useContributionPage';
import useUser from 'hooks/useUser';
import { SETTINGS } from 'routes';
import flagIsActiveForUser from 'utilities/flagIsActiveForUser';
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

export type UpgradePlan = Exclude<EnginePlan['name'], 'FREE'>;

const MaxPagesReachedModalPropTypes = {
  currentPlan: PropTypes.oneOf(Object.keys(PLAN_LABELS)).isRequired,
  onClose: PropTypes.func.isRequired,
  open: PropTypes.bool,
  recommendedPlan: PropTypes.oneOf(Object.keys(PLAN_LABELS).filter((name) => name !== PLAN_NAMES.FREE))
};

export interface MaxPagesReachedModalProps extends InferProps<typeof MaxPagesReachedModalPropTypes> {
  currentPlan: EnginePlan['name'];
  onClose: () => void;
  recommendedPlan?: UpgradePlan;
}

export function MaxPagesReachedModal({ currentPlan, onClose, open, recommendedPlan }: MaxPagesReachedModalProps) {
  const { user } = useUser();

  // The destination of the Upgrade button may be either internal or external.

  const LooseButton = Button as any;
  let upgradeButton = (
    <LinkButton color="primaryDark" href={PRICING_URL} target="_blank">
      Upgrade
    </LinkButton>
  );

  if (recommendedPlan === PLAN_NAMES.CORE) {
    if (user && flagIsActiveForUser(SELF_UPGRADE_ACCESS_FLAG_NAME, user)) {
      upgradeButton = (
        <LooseButton color="primaryDark" component={Link} to={SETTINGS.SUBSCRIPTION}>
          Upgrade
        </LooseButton>
      );
    } else {
      upgradeButton = (
        <LinkButton color="primaryDark" href={CORE_UPGRADE_URL} target="_blank">
          Upgrade
        </LinkButton>
      );
    }
  }

  return (
    <Modal open={!!open}>
      <ModalHeader icon={<ModalHeaderIcon />} onClose={onClose}>
        <strong>Max Pages Reached</strong>
      </ModalHeader>
      <ModalContent>
        <PlanLimit data-testid="plan-limit">
          You've reached the <RedEmphasis>maximum</RedEmphasis> number of pages for the {PLAN_LABELS[currentPlan]} tier.
        </PlanLimit>
        {recommendedPlan && (
          <>
            <Recommendation data-testid="recommendation">
              <strong>Want to create more pages?</strong> Check out{' '}
              {recommendedPlan !== PLAN_NAMES.PLUS && PLAN_LABELS[recommendedPlan]}
              {recommendedPlan === PLAN_NAMES.PLUS && (
                <PricingLink href={PRICING_URL} target="_blank">
                  {PLAN_LABELS[recommendedPlan]}
                </PricingLink>
              )}
              .
            </Recommendation>
            {recommendedPlan === PLAN_NAMES.CORE && (
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
            )}
          </>
        )}
      </ModalContent>
      <ModalFooter>
        <Button color="secondary" onClick={onClose}>
          Maybe Later
        </Button>
        {upgradeButton}
      </ModalFooter>
    </Modal>
  );
}

MaxPagesReachedModal.propTypes = MaxPagesReachedModalPropTypes;
export default MaxPagesReachedModal;
