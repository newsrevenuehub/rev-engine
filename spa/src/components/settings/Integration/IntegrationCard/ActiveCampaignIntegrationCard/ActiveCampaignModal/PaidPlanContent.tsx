import PropTypes, { InferProps } from 'prop-types';
import { Button, LinkButton, ModalContent, ModalFooter } from 'components/base';
import { KNOWLEDGE_BASE_URL } from 'constants/helperUrls';
import Intro from './Intro';

const PaidPlanContentPropTypes = {
  connected: PropTypes.bool,
  onClose: PropTypes.func.isRequired,
  onStartConnection: PropTypes.func.isRequired
};

export interface PaidPlanContentProps extends InferProps<typeof PaidPlanContentPropTypes> {
  onClose: () => void;
  onStartConnection: () => void;
}

export function PaidPlanContent({ connected, onClose, onStartConnection }: PaidPlanContentProps) {
  return (
    <>
      <ModalContent>
        <Intro />
      </ModalContent>
      <ModalFooter>
        <Button color="secondary" onClick={onClose}>
          {connected ? 'Close' : 'Maybe Later'}
        </Button>
        {connected ? (
          <LinkButton href={KNOWLEDGE_BASE_URL} target="_blank">
            Go To Knowledge Base
          </LinkButton>
        ) : (
          <Button color="primaryDark" onClick={onStartConnection}>
            Start Connection
          </Button>
        )}
      </ModalFooter>
    </>
  );
}

PaidPlanContent.propTypes = PaidPlanContentPropTypes;
export default PaidPlanContent;
