import { Button, Modal, ModalFooter, ModalHeader } from 'components/base';
import { ContributionPage } from 'hooks/useContributionPage';
import PropTypes, { InferProps } from 'prop-types';
import { ModalContent, ModalHeaderIcon, RedEmphasis } from './UnpublishModal.styled';

const UnpublishModalPropTypes = {
  onClose: PropTypes.func.isRequired,
  onUnpublish: PropTypes.func.isRequired,
  open: PropTypes.bool,
  page: PropTypes.object
};

export interface UnpublishModalProps extends InferProps<typeof UnpublishModalPropTypes> {
  onClose: () => void;
  onUnpublish: () => void;
  page?: ContributionPage;
}

export function UnpublishModal({ onClose, onUnpublish, open, page }: UnpublishModalProps) {
  if (!page) {
    return null;
  }

  const isDefault = page.revenue_program.default_donation_page === page.id;
  const header = isDefault ? 'Unpublish Default Page' : 'Unpublish Live Page';
  const content = isDefault ? (
    <>
      <p data-testid="unpublish-default-prompt">
        Are you sure you want to unpublish your default contribution page, <strong>'{page.name}'</strong>? You will need
        to update the link anywhere you are currently using it (e.g. buttons, email campaigns).
      </p>
      <p>
        <strong>Unpublishing a default contribution page will remove the ability to redirect inactive links.</strong>
      </p>
    </>
  ) : (
    <>
      <p data-testid="unpublish-prompt">
        Are you sure you want to unpublish <strong>'{page.name}'</strong>?
      </p>
      <p>
        Once unpublished, all links to this page will show an error when clicked. Be sure to replace links and buttons
        on your website and email campaigns with the new page url.
      </p>
    </>
  );

  return (
    <Modal onClose={onClose} open={!!open} width={590}>
      <ModalHeader icon={<ModalHeaderIcon />} onClose={onClose}>
        <RedEmphasis>{header}</RedEmphasis>
      </ModalHeader>
      <ModalContent>{content}</ModalContent>
      <ModalFooter>
        <Button color="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button color="error" onClick={onUnpublish}>
          Unpublish
        </Button>
      </ModalFooter>
    </Modal>
  );
}

UnpublishModal.propTypes = UnpublishModalPropTypes;
export default UnpublishModal;
