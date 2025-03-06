import { Button, ModalContent, ModalFooter } from 'components/base';
import PropTypes, { InferProps } from 'prop-types';
import Intro from './Intro';

const PaidPlanContentPropTypes = {
  onClose: PropTypes.func.isRequired,
  onStartConnection: PropTypes.func.isRequired
};

export interface PaidPlanContentProps extends InferProps<typeof PaidPlanContentPropTypes> {
  onClose: () => void;
  onStartConnection: () => void;
}

// TODO: add tests and stories

export function PaidPlanContent({ onClose, onStartConnection }: PaidPlanContentProps) {
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

PaidPlanContent.propTypes = PaidPlanContentPropTypes;
export default PaidPlanContent;
