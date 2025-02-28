import PropTypes, { InferProps } from 'prop-types';
import { Button, ModalContent, ModalFooter, RouterLinkButton } from 'components/base';
import { SETTINGS } from 'routes';
import { Intro } from './Intro';
import ModalUpgradePrompt from '../../ModalUpgradePrompt/ModalUpgradePrompt';

const FreePlanContentPropTypes = {
  onClose: PropTypes.func.isRequired
};

export interface FreePlanContentProps extends InferProps<typeof FreePlanContentPropTypes> {
  onClose: () => void;
}

/**
 * Contents of the ActiveCampaign modal when the user's organization is on the free plan.
 */
export function FreePlanContent({ onClose }: FreePlanContentProps) {
  return (
    <>
      <ModalContent>
        <Intro />
        <ModalUpgradePrompt text="Upgrade for integrated email marketing and more features!" />
      </ModalContent>
      <ModalFooter>
        <Button color="secondary" onClick={onClose}>
          Maybe Later
        </Button>
        <RouterLinkButton color="primaryDark" to={SETTINGS.SUBSCRIPTION}>
          Upgrade
        </RouterLinkButton>
      </ModalFooter>
    </>
  );
}

FreePlanContent.propTypes = FreePlanContentPropTypes;
export default FreePlanContent;
