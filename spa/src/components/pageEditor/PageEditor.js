import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import * as S from './PageEditor.styled';
import { useTheme } from 'styled-components';
import { AnimatePresence } from 'framer-motion';

// Deps
import { useAlert } from 'react-alert';
import isEmpty from 'lodash.isempty';
import convertDatetimeForAPI from 'utilities/convertDatetimeForAPI';
import { isBefore, isAfter } from 'date-fns';

// CSS files for libraries that ARE ONLY needed for page edit
import 'react-datepicker/dist/react-datepicker.css';

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
const IMAGE_KEYS = ['graphic', 'header_bg_image', 'header_logo'];
const THUMBNAIL_KEYS = ['graphic_thumbnail', 'header_bg_image_thumbnail', 'header_logo_thumbnail'];

/**
 * PageEditor
 * PageEditor renders an edit interface overlay on top of a non-live DonationPage component.
 * It controls state for the page it renders, as well as updated state from edit-widgets further
 * down the tree. Page-level validation occurs here as well.
 *
 * PageEditor is the root component of a split bundle.
 * PageEditor is rendered as a ProtectedRoute
 */
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
    } else if (isBefore(new Date(page.published_date), new Date())) {
      getUserConfirmation("You're making changes to a live donation page. Continue?", () => patchPage(updatedPage));
    } else {
      patchPage(updatedPage);
    }
  };

  const cleanImageKeys = (patchedPage) => {
    // Can't send back existing values for images, as they come in as slugs.
    // The API expects an image. So if typeof page.[image] is a string, delete the key.
    for (const image of IMAGE_KEYS) {
      // If it's undefined, we're removing an image. Keep that value.
      if (patchedPage[image] !== '' && typeof patchedPage[image] === 'string') {
        delete patchedPage[image];
      }
    }
    // Also, remove all the thumbnail fields from patchedPage. These never need to be set.
    for (const thumbnail of THUMBNAIL_KEYS) {
      delete patchedPage[thumbnail];
    }

    return patchedPage;
  };

  const processPageData = (patchedPage) => {
    const formData = new FormData();
    for (const pageKey in patchedPage) {
      if (Object.hasOwnProperty.call(patchedPage, pageKey)) {
        let datum = patchedPage[pageKey];
        if (datum instanceof Date) datum = convertDatetimeForAPI(datum);
        formData.append(pageKey, datum);
      }
    }
    return formData;
  };

  const patchPage = async (patchedPage) => {
    const patchedCleanedPage = cleanImageKeys(patchedPage);
    const formData = processPageData(patchedCleanedPage);
    try {
      const { data } = await axios.patch(`${PATCH_PAGE}${page.id}/`, formData);
      const successMessage = getSuccessMessage(page, data);

      alert.success(successMessage);
      setPage(data);
      setSelectedButton(PREVIEW);
    } catch (e) {
      console.log(e.response);
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

function getSuccessMessage(page, newPage) {
  const isNowPublished = isBefore(new Date(newPage.published_date), new Date());
  const isNowNotPublished = isAfter(new Date(newPage.published_date), new Date());
  const wasPublished = page.published_date && isBefore(new Date(page.published_date), new Date());
  const wasNotPublished = !page.published_date || isAfter(new Date(page.published_date), new Date());

  if (isNowPublished) {
    if (wasNotPublished) {
      return 'Your page has been updated and is now LIVE';
    }
    return 'Your LIVE page has been updated';
  }

  if (wasPublished && isNowNotPublished) {
    return 'Your page has been updated and is no longer live';
  }
  return 'Your page has been udpated';
}
