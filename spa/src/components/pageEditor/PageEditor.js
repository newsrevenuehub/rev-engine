import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import * as S from './PageEditor.styled';
import { useTheme } from 'styled-components';
import { AnimatePresence } from 'framer-motion';

// Deps
import { useAlert } from 'react-alert';
import isEmpty from 'lodash.isempty';

// Routing
import { useParams } from 'react-router-dom';

// AJAX
import axios from 'ajax/axios';
import { FULL_PAGE, PATCH_PAGE } from 'ajax/endpoints';

// Constants
import { GENERIC_ERROR } from 'constants/textConstants';

// Assets
import { faEye, faEdit, faSave } from '@fortawesome/free-solid-svg-icons';

// Context
import { useGlobalContext } from 'components/MainLayout';
import validatePage from './validatePage';

// Children
import * as dynamicElements from 'components/donationPage/pageContent/dynamicElements';
import CircleButton from 'elements/buttons/CircleButton';
import DonationPage from 'components/donationPage/DonationPage';
import GlobalLoading from 'elements/GlobalLoading';
import EditInterface from 'components/pageEditor/editInterface/EditInterface';

const PageEditorContext = createContext();

const EDIT = 'EDIT';
const PREVIEW = 'PREVIEW';

function PageEditor() {
  // Hooks
  const alert = useAlert();
  const theme = useTheme();
  const params = useParams();

  // Context
  const { getUserConfirmation } = useGlobalContext();

  // State
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState();
  const [updatedPage, setUpdatedPage] = useState();
  const [selectedButton, setSelectedButton] = useState(PREVIEW);
  const [showEditInterface, setShowEditInterface] = useState(false);
  const [errors, setErrors] = useState({});

  const fetchPageContent = useCallback(async () => {
    setLoading(true);
    const { revProgramSlug, pageSlug } = params;
    const requestParams = {
      revenue_program: revProgramSlug,
      page: pageSlug,
      live: 0
    };
    try {
      const { data } = await axios.get(FULL_PAGE, { params: requestParams });
      setPage(data);
      setLoading(false);
    } catch (e) {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    fetchPageContent();
  }, [params, fetchPageContent]);

  const handlePreview = () => {
    setSelectedButton(PREVIEW);
    setShowEditInterface(false);
  };

  const handleEdit = () => {
    setSelectedButton(EDIT);
    setShowEditInterface(true);
  };

  const handleSave = () => {
    setSelectedButton();

    const validationErrors = validatePage(updatedPage);
    if (validationErrors) {
      setErrors(validationErrors);
    } else {
      getUserConfirmation("You're making changes to a live donation page. Continue?", () => patchPage(updatedPage));
    }
  };

  const patchPage = async (patchedPage) => {
    try {
      const { data } = await axios.patch(`${PATCH_PAGE}${page.id}/`, patchedPage);
      setPage(data);
      setSelectedButton(PREVIEW);
      alert.success('Your page has been updated.');
    } catch (e) {
      alert.error(GENERIC_ERROR);
      setSelectedButton(PREVIEW);
    }
  };

  useEffect(() => {
    if (!isEmpty(errors)) {
      if (errors.missing) {
        alert.error(<MissingElementErrors missing={errors.missing} />);
      }
    }
  }, [errors, alert]);

  return (
    <PageEditorContext.Provider
      value={{ page, setPage, updatedPage, setUpdatedPage, showEditInterface, setShowEditInterface, errors }}
    >
      <S.PageEditor data-testid="page-editor">
        {loading && <GlobalLoading />}
        {showEditInterface && (
          <AnimatePresence>
            <EditInterface />
          </AnimatePresence>
        )}
        {page && <DonationPage live={false} page={page} />}
        <S.ButtonOverlay>
          <CircleButton
            onClick={handlePreview}
            selected={selectedButton === PREVIEW}
            icon={faEye}
            type="neutral"
            color={theme.colors.primary}
            data-testid="preview-page-button"
          />
          <CircleButton
            onClick={handleEdit}
            selected={selectedButton === EDIT}
            icon={faEdit}
            type="neutral"
            data-testid="edit-page-button"
          />
          <CircleButton
            onClick={handleSave}
            icon={faSave}
            type="neutral"
            data-testid="save-page-button"
            disabled={!updatedPage}
          />
        </S.ButtonOverlay>
      </S.PageEditor>
    </PageEditorContext.Provider>
  );
}

export const usePageEditorContext = () => useContext(PageEditorContext);

export default PageEditor;

function MissingElementErrors({ missing = [] }) {
  return (
    <>
      The following elements are required for your page to function properly:
      <ul data-testid="missing-elements-alert">
        {missing.map((missingEl) => (
          <li key={missingEl}>{dynamicElements[missingEl].displayName}</li>
        ))}
      </ul>
    </>
  );
}
