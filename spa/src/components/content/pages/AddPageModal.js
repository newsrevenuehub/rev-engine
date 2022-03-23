import { useEffect, useState, useCallback } from 'react';
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
import { REVENUE_PROGRAMS, LIST_PAGES, TEMPLATES } from 'ajax/endpoints';

// Children
import Modal from 'elements/modal/Modal';
import Input from 'elements/inputs/Input';
import Select from 'elements/inputs/Select';
import CircleButton from 'elements/buttons/CircleButton';
import { GENERIC_ERROR } from 'constants/textConstants';
import FormErrors from 'elements/inputs/FormErrors';
function AddPageModal({ isOpen, closeModal }) {
  const alert = useAlert();
  const theme = useTheme();
  const history = useHistory();

  const fetchRevPrograms = useRequest();
  const fetchTemplates = useRequest();
  const createPage = useRequest();

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');

  const [revenuePrograms, setRevenuePrograms] = useState([]);
  const [revenueProgram, setRevenueProgram] = useState();
  const [templates, setTemplates] = useState([]);
  const [template, setTemplate] = useState();

  const handleRequestFailure = useCallback(
    (e) => {
      alert.error(GENERIC_ERROR);
    },
    [alert]
  );

  useEffect(() => {
    async function getRevProgams() {
      setLoading(true);
      fetchRevPrograms(
        {
          method: 'GET',
          url: REVENUE_PROGRAMS
        },
        { onSuccess: ({ data }) => setRevenuePrograms(data), onFailure: handleRequestFailure }
      );
    }
    getRevProgams();
    setLoading(false);
  }, [handleRequestFailure]);

  useEffect(() => {
    async function getTemplates() {
      setLoading(true);
      fetchTemplates(
        {
          method: 'GET',
          url: TEMPLATES
        },
        { onSuccess: ({ data }) => setTemplates(data), onFailure: handleRequestFailure }
      );
    }
    getTemplates();
    setLoading(false);
  }, [handleRequestFailure]);

  const handleNameBlur = () => {
    if (!slug) setSlug(slugify(name));
  };

  const handleSlugBlur = () => {
    setSlug(slugify(slug));
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
      revenue_program_pk: revenueProgram.id
    };
    if (template) formData.template_pk = template.id;
    createPage(
      {
        method: 'POST',
        url: LIST_PAGES,
        data: formData
      },
      {
        onSuccess: ({ data }) => history.push(`${EDITOR_ROUTE}/${data.revenue_program.slug}/${data.slug}`),
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
            <S.InputWrapper>
              <Input
                label="Slug"
                helpText="How this page appears in the url"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                onBlur={handleSlugBlur}
                errors={errors?.slug}
                testid="page-slug"
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
            {templates.length > 0 && (
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
            )}
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
