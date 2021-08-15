import { useState, useEffect, createContext, useContext } from 'react';
import { useHistory } from 'react-router-dom';
import * as S from './PageEditor.styled';
import { useTheme } from 'styled-components';
import { AnimatePresence } from 'framer-motion';

// Deps
import { useAlert } from 'react-alert';
import isEmpty from 'lodash.isempty';
import { isBefore, isAfter } from 'date-fns';
import html2canvas from 'html2canvas';

// Utils
import formatDatetimeForAPI from 'utilities/formatDatetimeForAPI';

// CSS files for libraries that ARE ONLY needed for page edit
import 'react-datepicker/dist/react-datepicker.css';

// Routing
import { useParams } from 'react-router-dom';

// AJAX
import useRequest from 'hooks/useRequest';
import { DELETE_PAGE, FULL_PAGE, PATCH_PAGE, PAGE_STYLES, CONTRIBUTION_META } from 'ajax/endpoints';

// Routes
import { PAGES_SLUG } from 'routes';

// Constants
import { GENERIC_ERROR } from 'constants/textConstants';

// Assets
import { faEye, faEdit, faSave, faTrash } from '@fortawesome/free-solid-svg-icons';

// Context
import { useGlobalContext } from 'components/MainLayout';
import validatePage from './validatePage';

// Children
import * as dynamicElements from 'components/donationPage/pageContent/dynamicElements';
import CircleButton from 'elements/buttons/CircleButton';
import SegregatedStyles from 'components/donationPage/SegregatedStyles';
import DonationPage from 'components/donationPage/DonationPage';
import GlobalLoading from 'elements/GlobalLoading';
import EditInterface from 'components/pageEditor/editInterface/EditInterface';
import { useAnalyticsContext } from 'components/analytics/AnalyticsContext';
import { HUB_GA_V3_ID } from 'constants/analyticsConstants';
import BackButton from 'elements/BackButton';

const PageEditorContext = createContext();

const CAPTURE_PAGE_SCREENSHOT = process.env.REACT_APP_CAPTURE_PAGE_SCREENSHOT === 'true';

export const EDIT = 'EDIT';
export const PREVIEW = 'PREVIEW';
const IMAGE_KEYS = ['graphic', 'header_bg_image', 'header_logo'];
const THUMBNAIL_KEYS = ['graphic_thumbnail', 'header_bg_image_thumbnail', 'header_logo_thumbnail'];

export const DELETE_CONFIRM_MESSAGE =
  'This page is currently published, and deleting it means users ' +
  'will no longer be able to acccess it. Are you sure you want to proceed?';

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
  const parameters = useParams();

  // Context
  const { getUserConfirmation } = useGlobalContext();

  // State
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState();
  const [availableStyles, setAvailableStyles] = useState([]);
  const [contributionMetadata, setContributionMetadata] = useState([]);

  const [updatedPage, setUpdatedPage] = useState();
  const [selectedButton, setSelectedButton] = useState(PREVIEW);
  const [showEditInterface, setShowEditInterface] = useState(false);
  const [errors, setErrors] = useState({});

  const requestGetPage = useRequest();
  const requestGetDonorMetadata = useRequest();
  const requestGetPageStyles = useRequest();
  const requestPatchPage = useRequest();
  const requestPageDeletion = useRequest();

  const history = useHistory();

  const { setAnalyticsConfig } = useAnalyticsContext();

  useEffect(() => {
    setAnalyticsConfig({ hubGaV3Id: HUB_GA_V3_ID });
  }, []);

  useEffect(() => {
    setLoading(true);

    const params = {
      revenue_program: parameters.revProgramSlug,
      page: parameters.pageSlug,
      live: 0
    };
    requestGetPage(
      { method: 'GET', url: FULL_PAGE, params },
      {
        onSuccess: ({ data }) => {
          setPage(data);
          setLoading(false);
        },
        onFailure: () => setLoading(false)
      }
    );
    // Don't include requestGetPage for now.
  }, [parameters.revProgramSlug, parameters.pageSlug]);

  useEffect(() => {
    setLoading(true);
    requestGetPageStyles(
      { method: 'GET', url: PAGE_STYLES },
      {
        onSuccess: ({ data }) => {
          setAvailableStyles(data);
          setLoading(false);
        },
        onFailure: () => {
          setLoading(false);
        }
      }
    );
    // Don't include requestGetPageStyles for now.
  }, []);

  useEffect(() => {
    setLoading(true);
    requestGetDonorMetadata(
      { method: 'GET', url: CONTRIBUTION_META },
      {
        onSuccess: ({ data }) => {
          setContributionMetadata(data.filter((e) => e.donor_supplied));
          setLoading(false);
        },
        onFailure: () => {
          setLoading(false);
        }
      }
    );
  }, []);

  const handlePreview = () => {
    setSelectedButton(PREVIEW);
    setShowEditInterface(false);
  };

  const handleEdit = () => {
    setSelectedButton(EDIT);
    setShowEditInterface(true);
  };

  const handleSave = () => {
    setSelectedButton(PREVIEW);
    setShowEditInterface(false);

    const validationErrors = validatePage(updatedPage);
    const pageUpdates = { ...updatedPage };
    if (validationErrors) {
      setErrors(validationErrors);
    } else if (page.published_date && isBefore(new Date(page.published_date), new Date())) {
      getUserConfirmation("You're making changes to a live donation page. Continue?", () => patchPage(pageUpdates));
    } else {
      patchPage(pageUpdates);
    }
  };

  const doPageDeletionRequest = () => {
    requestPageDeletion(
      { method: 'DELETE', url: `${DELETE_PAGE}${page.id}/` },
      {
        onSuccess: () => {
          setLoading(false);
          history.push(PAGES_SLUG);
        },
        onFailure: (e) => {
          alert.error(GENERIC_ERROR);
          setLoading(false);
        }
      }
    );
  };

  const handleDelete = () => {
    if (pageHasBeenPublished(page)) {
      getUserConfirmation(DELETE_CONFIRM_MESSAGE, doPageDeletionRequest);
    } else {
      doPageDeletionRequest();
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
      let datumKey = pageKey;
      if (Object.hasOwnProperty.call(patchedPage, datumKey)) {
        let datum = patchedPage[datumKey];
        if (datum instanceof Date) datum = formatDatetimeForAPI(datum);
        if (datumKey === 'elements') datum = JSON.stringify(datum);
        if (datumKey === 'donor_benefits') {
          datumKey = 'donor_benefits_pk';
          if (datum === null) datum = '';
        }
        if (datumKey === 'published_date') {
          if (datum === undefined) datum = '';
        }
        if (datumKey === 'styles') {
          datumKey = 'styles_pk';
        }
        formData.append(datumKey, datum);
      }
    }
    return formData;
  };

  const patchPage = async (patchedPage) => {
    setLoading(true);

    let data = cleanImageKeys(patchedPage);
    data = cleanData(data);
    data = processPageData(data);
    if (CAPTURE_PAGE_SCREENSHOT) data = await addScreenshotToCleanedData(data, page.name);
    requestPatchPage(
      {
        method: 'PATCH',
        url: `${PATCH_PAGE}${page.id}/`,
        data
      },
      {
        onSuccess: ({ data }) => {
          const successMessage = getSuccessMessage(page, data);
          alert.success(successMessage);
          setErrors({});
          setPage(data);
          setSelectedButton(PREVIEW);
          setLoading(false);
        },
        onFailure: (e) => {
          if (e?.response?.data) {
            setErrors({ ...errors, ...e.response.data });
            setSelectedButton(EDIT);
            setShowEditInterface(true);
            setLoading(false);
          } else {
            alert.error(GENERIC_ERROR);
            setSelectedButton(PREVIEW);
          }
          setLoading(false);
        }
      }
    );
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
      value={{
        page,
        setPage,
        availableStyles,
        contributionMetadata,
        setAvailableStyles,
        updatedPage,
        setUpdatedPage,
        showEditInterface,
        setShowEditInterface,
        setSelectedButton,
        errors
      }}
    >
      <S.PageEditor data-testid="page-editor">
        {loading && <GlobalLoading />}
        {showEditInterface && (
          <AnimatePresence>
            <EditInterface />
          </AnimatePresence>
        )}
        {page && (
          <SegregatedStyles page={page}>
            <DonationPage live={false} page={page} />
          </SegregatedStyles>
        )}
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
          <CircleButton onClick={handleDelete} icon={faTrash} type="neutral" data-testid="delete-page-button" />

          <BackButton to={PAGES_SLUG} />
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

function pageHasBeenPublished(page, now = new Date()) {
  return page.published_date && isBefore(new Date(page.published_date), now);
}

function pageHasNotBeenPublished(page, now = new Date()) {
  return !page.published_date || isAfter(new Date(page.published_date), now);
}

function newPageIsCurrentlyPublished(newPage, now = new Date()) {
  isBefore(new Date(newPage.published_date), now);
}

function newPageIsNotCurrentlyPublished(newPage, now = new Date()) {
  isAfter(new Date(newPage.published_date), now);
}

function getSuccessMessage(page, newPage) {
  const now = new Date();
  const isNowPublished = newPageIsCurrentlyPublished(newPage, now);
  const isNowNotPublished = newPageIsNotCurrentlyPublished(newPage, now);
  const wasPublished = pageHasBeenPublished(page, now);
  const wasNotPublished = pageHasNotBeenPublished(page, now);

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

function cleanData(data) {
  if (data.donor_benefits) {
    data.donor_benefits = cleanDonorBenefits(data.donor_benefits);
  }

  if (data.styles) {
    data.styles = cleanStyles(data.styles);
  }
  return data;
}

function cleanDonorBenefits(donorBenefits) {
  if (donorBenefits.id === 'None') return '';
  return donorBenefits.id;
}

function cleanStyles(styles) {
  return styles.id;
}

async function addScreenshotToCleanedData(formData, pageName) {
  return new Promise(async (resolve, reject) => {
    const canvas = await html2canvas(document.getElementById('root'));
    canvas.toBlob((blob) => {
      formData.append('page_screenshot', blob, `${pageName}_${formatDatetimeForAPI(new Date())}.png`);
      resolve(formData);
    });
  });
}
