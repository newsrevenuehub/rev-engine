import { useState, useEffect } from 'react';
import * as S from './AddPageModal.styled';
import { useTheme } from 'styled-components';

import { faSave, faTrash } from '@fortawesome/free-solid-svg-icons';

// Routes
import { useHistory } from 'react-router-dom';
import { EDITOR_ROUTE, REV_PROGRAM_CREATE_SLUG } from 'routes';

// Util
import slugify from 'utilities/slugify';

// AJAX
import axios from 'ajax/axios';
import { REVENUE_PROGRAMS, LIST_PAGES } from 'ajax/endpoints';

// Children
import Modal from 'elements/modal/Modal';
import Input from 'elements/inputs/Input';
import Select from 'elements/inputs/Select';
import CircleButton from 'elements/buttons/CircleButton';

function AddPageModal({ isOpen, closeModal }) {
  const theme = useTheme();
  const history = useHistory();

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [revenuePrograms, setRevenuePrograms] = useState([]);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState();
  const [revenueProgram, setRevenueProgram] = useState();

  useEffect(() => {
    async function fetchRevPrograms() {
      setLoading(true);
      try {
        const { data } = await axios.get(REVENUE_PROGRAMS);
        setRevenuePrograms(data.results);
      } catch (e) {
      } finally {
        setLoading(false);
      }
    }
    fetchRevPrograms();
  }, []);

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

  const handleSave = async () => {
    setLoading(true);
    try {
      const formData = {
        name,
        slug,
        revenue_program_pk: revenueProgram.id
      };
      const { data } = await axios.post(LIST_PAGES, formData);
      history.push(`${EDITOR_ROUTE}/${data.revenue_program.slug}/${data.slug}`);
    } catch (e) {
      if (e.response) {
        setErrors(e.response.data);
      }
    } finally {
      setLoading(false);
    }
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
              />
            </S.InputWrapper>
          )}
          {!loading && revenuePrograms.length === 0 && (
            <S.NoRevPrograms>
              You need to set up a revenue program to create a page.{' '}
              <S.CreateRevProgramLink onClick={handleCreateRevProgram}>Create one?</S.CreateRevProgramLink>
            </S.NoRevPrograms>
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
