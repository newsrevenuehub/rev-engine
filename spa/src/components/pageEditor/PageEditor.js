import { useState, useEffect, createContext, useContext, useCallback, useMemo } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import * as S from './PageEditor.styled';
import { useTheme } from 'styled-components';
import { AnimatePresence } from 'framer-motion';

// Deps
import { useAlert } from 'react-alert';
import isEmpty from 'lodash.isempty';
import html2canvas from 'html2canvas';

// Utils
import formatDatetimeForAPI from 'utilities/formatDatetimeForAPI';

// CSS files for libraries that ARE ONLY needed for page edit
import 'react-datepicker/dist/react-datepicker.css';

// Routing
import { useParams } from 'react-router-dom';

// AJAX
import useRequest from 'hooks/useRequest';
import { DELETE_PAGE, PATCH_PAGE, LIST_PAGES, LIST_STYLES, DRAFT_PAGE_DETAIL } from 'ajax/endpoints';

// Routes
import { CONTENT_SLUG } from 'routes';

// Constants
import { DELETE_LIVE_PAGE_CONFIRM_TEXT, GENERIC_ERROR } from 'constants/textConstants';

// Settings
import { CAPTURE_PAGE_SCREENSHOT } from 'appSettings';

// Assets
import { faEye, faEdit, faSave, faTrash } from '@fortawesome/free-solid-svg-icons';

// Context
import { useConfirmationModalContext } from 'elements/modal/GlobalConfirmationModal';
import validatePage from './validatePage';

// Hooks
import useWebFonts from 'hooks/useWebFonts';
import { useConfigureAnalytics } from 'components/analytics';

// Children
import CircleButton from 'elements/buttons/CircleButton';
import SegregatedStyles from 'components/donationPage/SegregatedStyles';
import DonationPage from 'components/donationPage/DonationPage';
import GlobalLoading from 'elements/GlobalLoading';
import EditInterface from 'components/pageEditor/editInterface/EditInterface';
import PageTitle from 'elements/PageTitle';
import { Tooltip } from 'components/base';
import { usePageContext } from 'components/dashboard/PageContext';
import getSuccessMessage, { pageHasBeenPublished } from 'utilities/editPageGetSuccessMessage';

export const PageEditorContext = createContext();

export const EDIT = 'EDIT';
export const PREVIEW = 'PREVIEW';
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
  const parameters = useParams();

  // Context
  const getUserConfirmation = useConfirmationModalContext();
  const { setPage: setPageContext, updatedPage, setUpdatedPage } = usePageContext();

  const location = useLocation();
  const pageId = location?.state?.pageId;

  // State
  const [loading, setLoading] = useState(false);
  const [page, rawSetPage] = useState();
  const setPage = useCallback((value) => {
    // Page data may have a null currency property if Stripe hasn't been
    // connected yet. We want to force it to always at least contain a plausible
    // currency symbol while the user is editing.
    //
    // We shouldn't have this logic on a live page--Stripe should always be
    // connected in that case.

    if (!value.currency) {
      rawSetPage({ ...value, currency: { symbol: '$' } });
    } else {
      rawSetPage(value);
    }
  }, []);

  const [availableStylesRpId, setAvailableStylesRpId] = useState();
  const [availableStyles, setAvailableStyles] = useState([]);

  const pageTitle = useMemo(
    () =>
      `Edit | ${page?.name ? `${page?.name} | ` : ''}${
        page?.revenue_program?.name ? `${page?.revenue_program?.name}` : ''
      }`,
    [page?.name, page?.revenue_program?.name]
  );

  const [selectedButton, setSelectedButton] = useState(PREVIEW);
  const [updatePageAndSave, setUpdatePageAndSave] = useState(null);
  const [showEditInterface, setShowEditInterface] = useState(false);
  const [errors, setErrors] = useState({});

  const requestGetPage = useRequest();
  const requestGetPageStyles = useRequest();
  const requestPatchPage = useRequest();
  const requestPageDeletion = useRequest();

  const history = useHistory();

  useWebFonts(page?.styles?.font);

  useConfigureAnalytics();

  const handleGetPageFailure = useCallback(
    (error) => {
      setLoading(false);
      if (error.response?.data) {
        alert.error(error.response.data.detail, { timeout: 0 });
      }
    },
    [alert]
  );

  useEffect(() => {
    // Empty page on first load
    setPageContext(null);
    setUpdatedPage(null);
  }, [setPageContext, setUpdatedPage]);

  useEffect(() => {
    setLoading(true);

    // If the user got to this page from `dashboard/content`, location state
    // will have pageId, so we can cut to chase and grab the page directly.
    // But if user goes directly to this page ()`edit/<rev-program-name/<page-name`),
    // pageId will not be in passed location state. In that case, we use the `DRAFT_PAGE_DETAIL`
    // endpoint on the API, whose name, it should be noted, is no longer in alignment with its
    // concrete use. The `DRAFT_PAGE_DETAIL` endpoint looks for the RP and page slugs to be passed
    // in as query parameters.
    const url = pageId ? `${LIST_PAGES}${pageId}/` : DRAFT_PAGE_DETAIL;
    const params = pageId
      ? null
      : {
          revenue_program: parameters.revProgramSlug,
          page: parameters.pageSlug
        };
    const config = { method: 'GET', url, params };

    requestGetPage(config, {
      onSuccess: ({ data }) => {
        setPage(data);
        setPageContext(data);
        setLoading(false);
        handleEdit();
      },
      onFailure: handleGetPageFailure //() => setLoading(false)
    });
    // Don't include requestGetPage for now.
  }, [pageId, parameters.revProgramSlug, parameters.pageSlug, handleGetPageFailure]);

  useEffect(() => {
    // If the revenue program of the page is either available after loading or
    // has changed, load styles associated with the RP.

    const rpId = page?.revenue_program?.id;
    if (rpId && rpId !== availableStylesRpId) {
      setLoading(true);
      setAvailableStylesRpId(rpId);
      requestGetPageStyles(
        { method: 'GET', url: LIST_STYLES, params: { revenue_program: rpId } },
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
    }
    // Don't include requestGetPageStyles for now.
  }, [availableStylesRpId, page]);

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
    } else if (pageHasBeenPublished(page)) {
      getUserConfirmation("You're making changes to a live contribution page. Continue?", () => patchPage(pageUpdates));
    } else {
      setUpdatePageAndSave(pageUpdates);
    }
  };

  const doPageDeletionRequest = () => {
    requestPageDeletion(
      { method: 'DELETE', url: `${DELETE_PAGE}${page.id}/` },
      {
        onSuccess: () => {
          setLoading(false);
          history.push(CONTENT_SLUG);
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
      getUserConfirmation(DELETE_LIVE_PAGE_CONFIRM_TEXT, doPageDeletionRequest);
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

  function processImages(datum, formData) {
    /* processImages
      Attaches a File object to the formData to be returned to the backend.

      Datastore expects
      data = [{"uuid": str, "type": "DImage", "content": {}]
      files = {"str(<UUID>)": Blob}
    */
    datum.map((item) => {
      if (item.type === 'DImage' && item.content instanceof File) {
        formData.append(item.uuid, item.content, item.content.name);
      }
    });
    return datum;
  }

  /**
   * processPageData
   * The primary function for serializing the DP data before transmitting to the backend.
   * If a new section is added that requires DImages, follow the pattern for `sidebar_elements`
   * @param {object} patchedPage - Object containing page data
   * @returns {FormData} formData
   */
  const processPageData = useCallback((patchedPage) => {
    const formData = new FormData();
    for (const pageKey in patchedPage) {
      let datumKey = pageKey;
      if (Object.hasOwnProperty.call(patchedPage, datumKey)) {
        let datum = patchedPage[datumKey];
        if (datum instanceof Date) datum = formatDatetimeForAPI(datum, true);
        if (datumKey === 'elements') datum = JSON.stringify(datum);
        if (datumKey === 'sidebar_elements') datum = JSON.stringify(processImages(datum, formData));
        if (datumKey === 'donor_benefits') {
          datumKey = 'donor_benefits_pk';
          if (datum === null) datum = '';
        }
        if (datumKey === 'published_date') {
          if (datum === undefined) datum = '';
        }
        formData.append(datumKey, datum);
      }
    }
    return formData;
  }, []);

  const patchPage = useCallback(
    async (patchedPage) => {
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
            setPageContext(data);
            setUpdatedPage(null);
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
    },
    [alert, errors, page, processPageData, requestPatchPage]
  );

  useEffect(() => {
    if (selectedButton === PREVIEW && updatePageAndSave) {
      patchPage(updatePageAndSave);
      setUpdatePageAndSave(null);
    }
  }, [patchPage, selectedButton, updatePageAndSave]);

  useEffect(() => {
    if (!isEmpty(errors)) {
      if (errors.elementErrors) {
        alert.error(<ElementErrors elementErrors={errors.elementErrors} />, { timeout: 0 });
      }
    }
  }, [errors, alert]);

  return (
    <>
      <PageTitle title={pageTitle} />
      <PageEditorContext.Provider
        value={{
          page,
          setPage,
          availableStyles,
          setAvailableStyles,
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
          {!loading && page && (
            <SegregatedStyles page={page}>
              {/* set stringified page as key to guarantee that ALL page changes will re-render the page in edit mode */}
              <DonationPage key={page ? JSON.stringify(page) : ''} live={false} page={page} />
            </SegregatedStyles>
          )}

          {page && (
            <S.ButtonOverlay>
              <CircleButton
                onClick={handlePreview}
                selected={selectedButton === PREVIEW}
                icon={faEye}
                buttonType="neutral"
                color={theme.colors.primary}
                data-testid="preview-page-button"
                tooltipText="View"
              />

              <CircleButton
                onClick={handleEdit}
                selected={selectedButton === EDIT}
                icon={faEdit}
                buttonType="neutral"
                data-testid="edit-page-button"
                tooltipText="Edit"
              />

              {updatedPage ? (
                <CircleButton
                  onClick={handleSave}
                  icon={faSave}
                  buttonType="neutral"
                  data-testid="save-page-button"
                  disabled={!updatedPage}
                  tooltipText="Save"
                />
              ) : (
                <Tooltip title="Save" placement="right">
                  <S.PageEditorBackButton data-testid="save-page-button">
                    <S.DisabledSaveIcon icon={faSave} type="neutral" disabled={!updatedPage || loading} />
                  </S.PageEditorBackButton>
                </Tooltip>
              )}

              <CircleButton
                onClick={handleDelete}
                icon={faTrash}
                buttonType="caution"
                data-testid="delete-page-button"
                tooltipText="Delete"
              />
            </S.ButtonOverlay>
          )}
        </S.PageEditor>
      </PageEditorContext.Provider>
    </>
  );
}

export const usePageEditorContext = () => useContext(PageEditorContext);

export default PageEditor;

function ElementErrors({ elementErrors = [] }) {
  return (
    <>
      The following elements are required for your page to function properly:
      <ul data-testid="missing-elements-alert">
        {elementErrors.map((elError) => (
          <li key={elError.element}>{elError.message}</li>
        ))}
      </ul>
    </>
  );
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
