import { useState, useCallback, useEffect } from 'react';
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
import FormErrors from 'elements/inputs/FormErrors';

function AddPageModal({ isOpen, closeModal, pagesByRevenueProgram }) {
  const alert = useAlert();
  const theme = useTheme();
  const history = useHistory();
  const {
    user: { revenue_programs: revenuePrograms }
  } = useUser();
  const createPage = useRequest();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');

  const [revenueProgram, setRevenueProgram] = useState('');

  const handleNameBlur = () => {
    setSlug(slugify(`${name}-${Math.random().toFixed(4)}`));
  };

  const canSavePage = useCallback(
    (override) => (override ? !loading : !loading && !!revenueProgram && !!slug && !!name),
    [loading, name, revenueProgram, slug]
  );

  const handleSaveFailure = useCallback(
    (e) => {
      setLoading(false);
      if (e.response?.data) {
        setErrors(e.response.data);
      } else {
        alert.error('There was an error and we could not create your new page. We have been notified.');
      }
    },
    [alert]
  );

  const handleSave = useCallback(
    async (e, overrideForm = undefined) => {
      e?.preventDefault();
      if (!canSavePage(overrideForm !== undefined)) return;
      setLoading(true);

      const formData = {
        name: overrideForm?.name || name,
        slug: overrideForm?.slug || slug,
        revenue_program: overrideForm?.revenueProgramId || revenueProgram.id
      };

      createPage(
        {
          method: 'POST',
          url: LIST_PAGES,
          data: formData
        },
        {
          onSuccess: ({ data }) => {
            setLoading(false);
            history.push({
              pathname: `${EDITOR_ROUTE}/${formData.revenue_program}/${formData.slug}`,
              state: { pageId: data.id }
            });
          },
          onFailure: handleSaveFailure
        }
      );
    },
    [canSavePage, createPage, handleSaveFailure, history, name, revenueProgram.id, slug]
  );

  const handleDiscard = () => {
    closeModal();
  };

  const handleTemporaryPageName = (pages) => {
    const pagesSize = pages?.length + 1;
    const slugs = pages.map((_) => _.slug);
    let number = pagesSize;
    let tempName = `Page ${number}`;
    let tempSlug = slugify(tempName);
    while (slugs.includes(tempSlug)) {
      number += 1;
      tempName = `Page ${number}`;
      tempSlug = slugify(tempName);
    }
    return { tempName, tempSlug };
  };

  useEffect(() => {
    if (revenuePrograms?.length === 1) {
      const { tempName, tempSlug } = handleTemporaryPageName(pagesByRevenueProgram[0]?.pages);
      closeModal();
      handleSave(undefined, {
        name: tempName,
        slug: tempSlug,
        revenueProgramId: revenuePrograms[0].id
      });
    }
  }, [closeModal, handleSave, pagesByRevenueProgram, revenuePrograms]);

  if (revenuePrograms?.length === 1) {
    return null;
  }

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
