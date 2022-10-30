import * as S from './UnsavedChangesModal.styled';

// Assets
import ReportOutlinedIcon from '@material-ui/icons/ReportOutlined';
import CloseIcon from '@material-ui/icons/Close';

// Routing
import { useHistory } from 'react-router-dom';

const UnsavedChangesModal = ({ isOpen, closeModal, to }) => {
  const history = useHistory();
  const handleExit = () => {
    closeModal();
    if (to) history.replace(to);
    else history.goBack();
  };

  return (
    <S.Modal
      open={isOpen}
      onClose={closeModal}
      aria-labelledby="Unsaved Changes Modal"
      aria-describedby="Are you sure you want to exit without saving your changes?"
    >
      <S.UnsavedChangesModal data-testid="unsaved-changes-modal">
        <S.IconButton onClick={closeModal}>
          <S.Icon type="grey">
            <CloseIcon />
          </S.Icon>
        </S.IconButton>
        <S.Header>
          <S.Icon type="error">
            <ReportOutlinedIcon />
          </S.Icon>
          <S.ModalTitle>Unsaved Changes</S.ModalTitle>
        </S.Header>
        <S.Description>
          Are you sure you want to exit
          <br /> without saving your changes?
        </S.Description>
        <S.Buttons>
          <S.Button onClick={closeModal}>Cancel</S.Button>
          <S.Button variety="error" variant="contained" onClick={handleExit}>
            Yes, exit
          </S.Button>
        </S.Buttons>
      </S.UnsavedChangesModal>
    </S.Modal>
  );
};

export default UnsavedChangesModal;
