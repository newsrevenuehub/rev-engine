import { useState, useCallback } from 'react';
import * as S from './AddPageModal.styled';
import { useTheme } from 'styled-components';

import { faSave, faTrash } from '@fortawesome/free-solid-svg-icons';
import { useAlert } from 'react-alert';

// Routes
import { useHistory } from 'react-router-dom';
import { EDITOR_ROUTE } from 'routes';

// Util
import slugify from 'utilities/slugify';

// AJAX
import useRequest from 'hooks/useRequest';
import { LIST_PAGES } from 'ajax/endpoints';

import useUser from 'hooks/useUser';

// Children
import Modal from 'elements/modal/Modal';
import Input from 'elements/inputs/Input';
import Select from 'elements/inputs/Select';
import CircleButton from 'elements/buttons/CircleButton';
// Intentionally commented out, see DEV-1493
// import { GENERIC_ERROR } from 'constants/textConstants';
// import { REVENUE_PROGRAMS, LIST_PAGES, TEMPLATES } from 'ajax/endpoints';

import FormErrors from 'elements/inputs/FormErrors';

function AddPageModal({ isOpen, closeModal }) {
  const alert = useAlert();
  const theme = useTheme();
  const history = useHistory();
  const { revenue_programs: revenuePrograms } = useUser();
  const createPage = useRequest();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');

  const [revenueProgram, setRevenueProgram] = useState(null);

  // Intentionally commented out, see DEV-1493
  // const fetchTemplates = useRequest();
  // const [templates, setTemplates] = useState([]);
  // const [template, setTemplate] = useState();
  // const handleRequestFailure = useCallback(
  //   (e) => {
  //     alert.error(GENERIC_ERROR);
  //   },
  //   [alert]
  // );
  // useEffect(() => {
  //   async function getTemplates() {
  //     setLoading(true);
  //     fetchTemplates(
  //       {
  //         method: 'GET',
  //         url: TEMPLATES
  //       },
  //       { onSuccess: ({ data }) => setTemplates(data), onFailure: handleRequestFailure }
  //     );
  //   }
  //   getTemplates();
  //   setLoading(false);
  // }, [handleRequestFailure]);

  const handleNameBlur = () => {
    setSlug(slugify(`${name}-${Math.random().toFixed(4)}`));
  };

  const canSavePage = () => !loading && !!revenueProgram && !!slug && !!name;

  const handleSaveFailure = useCallback(
    (e) => {
      if (e.response?.data) {
        setErrors(e.response.data);
      } else {
        alert.error('There was an error and we could not create your new page. We have been notified.');
      }
    },
    [alert]
  );

  const handleSave = async (e) => {
    e.preventDefault();
    if (!canSavePage()) return;
    setLoading(true);

    const formData = {
      name,
      slug,
      revenue_program: revenueProgram.id
    };
    // Intentionally commented-out, see DEV-1493
    // if (template) formData.template_pk = template.id;
    createPage(
      {
        method: 'POST',
        url: LIST_PAGES,
        data: formData
      },
      {
        onSuccess: ({ data }) =>
          history.push({
            pathname: `${EDITOR_ROUTE}/${revenueProgram.slug}/${slug}`,
            state: { pageId: data.id }
          }),
        onFailure: handleSaveFailure
      }
    );
    setLoading(false);
  };

  const handleDiscard = () => {
    closeModal();
  };

  return (
    <Modal isOpen={isOpen} closeModal={closeModal}>
      <S.AddPageModal data-testid="page-create-modal">
        <S.ModalTitle>Create a new contribution page</S.ModalTitle>
        <S.PageForm onSubmit={handleSave}>
          <S.FormFields>
            <S.InputWrapper>
              <Input
                label="Name"
                helpText="Unique name for this page"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={handleNameBlur}
                errors={errors?.name}
                testid="page-name"
              />
            </S.InputWrapper>
            {revenuePrograms.length > 0 && (
              <S.InputWrapper>
                <Select
                  label="Choose a revenue program for this page"
                  onSelectedItemChange={({ selectedItem }) => setRevenueProgram(selectedItem)}
                  selectedItem={revenueProgram}
                  items={revenuePrograms}
                  itemToString={(i) => i.name}
                  placeholder="Select a revenue program"
                  dropdownPosition="above"
                  displayAccessor="name"
                  testId="revenue-program-picker"
                />
              </S.InputWrapper>
            )}
            {!loading && revenuePrograms.length === 0 && (
              <S.NoRevPrograms>You need to set up a revenue program to create a page.</S.NoRevPrograms>
            )}
            {/*
             // Intentionally commented out, see DEV-1493
             templates.length > 0 && (
              <S.InputWrapper>
                <Select
                  label="[Optional] Choose a page template"
                  onSelectedItemChange={({ selectedItem }) => setTemplate(selectedItem)}
                  selectedItem={template}
                  items={templates}
                  itemToString={(i) => i.name}
                  placeholder="Select a template"
                  dropdownPosition="above"
                  displayAccessor="name"
                  testId="template-picker"
                />
              </S.InputWrapper>
            )
             */}
            <FormErrors errors={errors?.non_field_errors} />
          </S.FormFields>
          <S.Buttons>
            <CircleButton
              type="submit"
              icon={faSave}
              color={theme.colors.success}
              buttonType="neutral"
              disabled={!canSavePage()}
              data-testid="save-new-page-button"
            />
            <CircleButton
              onClick={handleDiscard}
              icon={faTrash}
              color={theme.colors.caution}
              buttonType="neutral"
              data-testid="discard-new-page-button"
            />
          </S.Buttons>
        </S.PageForm>
      </S.AddPageModal>
    </Modal>
  );
}

export default AddPageModal;
