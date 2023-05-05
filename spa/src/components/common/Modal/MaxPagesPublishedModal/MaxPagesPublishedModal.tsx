import PropTypes, { InferProps } from 'prop-types';
import { Button, Link, Modal, ModalFooter, ModalHeader } from 'components/base';
import { PRICING_URL } from 'constants/helperUrls';
import { PLAN_LABELS, PLAN_NAMES } from 'constants/orgPlanConstants';
import { EnginePlan } from 'hooks/useContributionPage';
import { ModalContent, ModalHeaderIcon, RedEmphasis } from './MaxPagesPublishedModal.styled';

const MaxPagesPublishedPropTypes = {
  currentPlan: PropTypes.oneOf(Object.keys(PLAN_NAMES).filter((name) => name !== 'PLUS')).isRequired,
  onClose: PropTypes.func.isRequired,
  open: PropTypes.bool
};

export interface MaxPagesPublishedModalProps
  extends Omit<InferProps<typeof MaxPagesPublishedPropTypes>, 'currentPlan'> {
  currentPlan: Omit<EnginePlan['name'], 'PLUS'>;
}

export function MaxPagesPublishedModal({ currentPlan, onClose, open }: MaxPagesPublishedModalProps) {
  return (
    <Modal open={!!open}>
      <ModalHeader icon={<ModalHeaderIcon />} onClose={onClose}>
        <RedEmphasis>Max Pages Published</RedEmphasis>
      </ModalHeader>
      <ModalContent>
        {currentPlan === PLAN_LABELS.FREE && (
          <>
            <p>
              You've published the <RedEmphasis>maximum</RedEmphasis> number of live pages for the Free tier. Unpublish
              your current checkout page to make this page live.
            </p>
            <p>
              <strong>Want multiple published pages?</strong> Learn more about{' '}
              <Link href={PRICING_URL} target="_blank">
                Core and Plus
              </Link>
              .
            </p>
          </>
        )}
        {currentPlan === 'CORE' && (
          <p>
            <p>
              You've published the <RedEmphasis>maximum</RedEmphasis> number of live pages for the Core tier. Unpublish
              a published checkout page to make this page live.
            </p>
            <strong>Want more published pages?</strong> Learn more about{' '}
            <Link href={PRICING_URL} target="_blank">
              Plus
            </Link>
            .
          </p>
        )}
      </ModalContent>
      <ModalFooter>
        <Button color="secondary" onClick={onClose}>
          Close
        </Button>
      </ModalFooter>
    </Modal>
  );
}

MaxPagesPublishedModal.propTypes = MaxPagesPublishedPropTypes;
export default MaxPagesPublishedModal;
