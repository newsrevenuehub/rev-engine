import { Button, ModalContent, ModalFooter } from 'components/base';
import PropTypes, { InferProps } from 'prop-types';
import Intro from './Intro';

const CorePlanContentPropTypes = {
  onClose: PropTypes.func.isRequired,
  onStartConnection: PropTypes.func.isRequired
};

export interface CorePlanContentProps extends InferProps<typeof CorePlanContentPropTypes> {
  onClose: () => void;
  onStartConnection: () => void;
}

export function CorePlanContent({ onClose, onStartConnection }: CorePlanContentProps) {
  return (
    <>
      <ModalContent>
        <Intro />
      </ModalContent>
      <ModalFooter>
        <Button color="secondary" onClick={onClose}>
          Maybe Later
        </Button>
        <Button color="primaryDark" onClick={onStartConnection}>
          Start Connection
        </Button>
      </ModalFooter>
    </>
  );
}

CorePlanContent.propTypes = CorePlanContentPropTypes;
export default CorePlanContent;
