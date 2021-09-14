import { useState } from 'react';
import * as S from './CreateTemplateModal.styled';

// Assets
import { faSave, faTrash } from '@fortawesome/free-solid-svg-icons';

// Deps
import { useTheme } from 'styled-components';
import { useAlert } from 'react-alert';

// AJAX
import useRequest from 'hooks/useRequest';
import { TEMPLATES } from 'ajax/endpoints';

// Constants
import { GENERIC_ERROR } from 'constants/textConstants';

// Components
import CircleButton from 'elements/buttons/CircleButton';
import Modal from 'elements/modal/Modal';
import Input from 'elements/inputs/Input';

function CreateTemplateModal({ isOpen, closeModal, page = {} }) {
  const alert = useAlert();
  const theme = useTheme();

  const requestCreateTemplate = useRequest();

  const [name, setName] = useState(page?.name || '');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const onSuccess = ({ data }) => {
    const templateName = data['name'];
    const successMessage = `Create a new template: ${templateName}`;
    alert.success(successMessage);
    closeModal();
  };

  const onFailure = (e) => {
    if (e?.response?.data) {
      setErrors(e.response.data);
    } else {
      alert.error(GENERIC_ERROR);
    }
  };

  const handleSave = () => {
    setLoading(true);
    const data = {
      page_pk: page.id,
      name
    };
    requestCreateTemplate(
      {
        method: 'POST',
        url: TEMPLATES,
        data
      },
      {
        onSuccess,
        onFailure
      }
    );
    setLoading(false);
  };

  return (
    <Modal isOpen={isOpen} closeModal={closeModal}>
      <S.CreateTemplateModal data-testid="template-create-modal">
        <S.ModalTitle>Create a template from page "{page.name}"</S.ModalTitle>
        <S.PageForm>
          <S.InputWrapper>
            <Input
              label="Name this template"
              helpText="Unique name for this template"
              value={name}
              onChange={(e) => setName(e.target.value)}
              errors={errors?.name}
              testid="page-name"
            />
          </S.InputWrapper>
        </S.PageForm>
        <S.Buttons>
          <CircleButton
            onClick={handleSave}
            icon={faSave}
            color={theme.colors.success}
            type="neutral"
            disabled={!name || loading}
            data-testid="save-template-button"
          />
          <CircleButton
            onClick={closeModal}
            icon={faTrash}
            color={theme.colors.caution}
            type="neutral"
            disabled={loading}
            data-testid="discard-template-button"
          />
        </S.Buttons>
      </S.CreateTemplateModal>
    </Modal>
  );
}

export default CreateTemplateModal;
