import InfoOutlinedIcon from '@material-ui/icons/InfoOutlined';
import { Modal, ModalContent, ModalFooter, ModalHeader } from 'components/base';
import PropTypes, { InferProps } from 'prop-types';

import { CancelButton, ExportButton, InfoIcon, Title } from './ExportModal.styled';

export type ExportModalProps = InferProps<typeof ExportModalPropTypes>;

const ExportModal = ({ open, onClose, onExport, transactions, email }: ExportModalProps) => {
  const handleExport = () => {
    onClose();
    onExport();
  };

  return (
    <Modal width={565} open={open} onClose={onClose} aria-labelledby="export-modal-title">
      <ModalHeader
        onClose={onClose}
        icon={
          <InfoIcon>
            <InfoOutlinedIcon />
          </InfoIcon>
        }
      >
        <Title id="export-modal-title">Export to Email</Title>
      </ModalHeader>
      <ModalContent>
        <p style={{ margin: 0 }}>
          You're exporting <i>{transactions}</i> transactions. When the export is complete, we will email it to{' '}
          <b>{email}</b>.
        </p>
      </ModalContent>
      <ModalFooter>
        <CancelButton color="secondary" variant="contained" onClick={onClose}>
          Cancel
        </CancelButton>
        <ExportButton
          data-testid="modal-export-button"
          color="information"
          variant="contained"
          onClick={handleExport}
          disableElevation
        >
          Export
        </ExportButton>
      </ModalFooter>
    </Modal>
  );
};

const ExportModalPropTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onExport: PropTypes.func.isRequired,
  transactions: PropTypes.number.isRequired,
  email: PropTypes.string.isRequired
};

ExportModal.propTypes = ExportModalPropTypes;

export default ExportModal;
