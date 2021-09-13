import { useEffect, useState, useCallback } from 'react';
import * as S from './AddPageModal.styled';
import { useTheme } from 'styled-components';

import { faSave, faTrash } from '@fortawesome/free-solid-svg-icons';
import { useAlert } from 'react-alert';

// Routes
import { useHistory } from 'react-router-dom';
import { EDITOR_ROUTE, REV_PROGRAM_CREATE_SLUG } from 'routes';

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
        { onSuccess: ({ data }) => setRevenuePrograms(data.results), onFailure: handleRequestFailure }
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

  const handleCreateRevProgram = () => {
    history.push(REV_PROGRAM_CREATE_SLUG);
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

  const handleSave = async () => {
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
        <S.ModalTitle>Create a new donation page</S.ModalTitle>
        <S.PageForm>
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
            <S.InputWrapper data-testid="revenue-program-picker">
              <Select
                label="Choose a revenue program for this page"
                onSelectedItemChange={({ selectedItem }) => setRevenueProgram(selectedItem)}
                selectedItem={revenueProgram}
                items={revenuePrograms}
                itemToString={(i) => i.name}
                placeholder="Select a revenue program"
                dropdownPosition="above"
                displayAccessor="name"
              />
            </S.InputWrapper>
          )}
          {!loading && revenuePrograms.length === 0 && (
            <S.NoRevPrograms>
              You need to set up a revenue program to create a page.{' '}
              <S.CreateRevProgramLink onClick={handleCreateRevProgram}>Create one?</S.CreateRevProgramLink>
            </S.NoRevPrograms>
          )}
          {templates.length > 0 && (
            <S.InputWrapper data-testid="template-picker">
              <Select
                label="[Optional] Choose a page template"
                onSelectedItemChange={({ selectedItem }) => setTemplate(selectedItem)}
                selectedItem={template}
                items={templates}
                itemToString={(i) => i.name}
                placeholder="Select a template"
                dropdownPosition="above"
                displayAccessor="name"
              />
            </S.InputWrapper>
          )}
        </S.PageForm>
        <S.Buttons>
          <CircleButton
            onClick={handleSave}
            icon={faSave}
            color={theme.colors.success}
            type="neutral"
            disabled={!canSavePage()}
            data-testid="save-styles-button"
          />
          <CircleButton
            onClick={handleDiscard}
            icon={faTrash}
            color={theme.colors.caution}
            type="neutral"
            data-testid="discard-styles-button"
          />
        </S.Buttons>
      </S.AddPageModal>
    </Modal>
  );
}

export default AddPageModal;
