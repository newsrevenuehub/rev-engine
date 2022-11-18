import { Divider } from '@material-ui/core';
import CloseIcon from '@material-ui/icons/Close';
import InfoOutlinedIcon from '@material-ui/icons/InfoOutlined';
import PropTypes, { InferProps } from 'prop-types';

import {
  Actions,
  CancelButton,
  Content,
  ExportButton,
  Flex,
  Icon,
  IconButton,
  InfoIcon,
  Modal,
  Paper,
  Title
} from './ExportModal.styled';

export type ExportModalProps = InferProps<typeof ExportModalPropTypes>;

const ExportModal = ({ open, onClose, onExport, transactions, email }: ExportModalProps) => {
  const handleExport = () => {
    onClose();
    onExport();
  };

  return (
    <Modal open={open} onClose={onClose} aria-labelledby="export-modal-title">
      <Paper>
        <IconButton onClick={onClose}>
          <Icon>
            <CloseIcon />
          </Icon>
        </IconButton>
        <Flex>
          <InfoIcon>
            <InfoOutlinedIcon />
          </InfoIcon>
          <Title id="export-modal-title">Export to Email</Title>
        </Flex>
        <Divider />
        <Content>
          <p style={{ margin: 0 }}>
            Your exporting <i>{transactions}</i> transactions. When the export is complete, we will email it to{' '}
            <b>{email}</b>.
          </p>
          <Actions>
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
          </Actions>
        </Content>
      </Paper>
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
