import { createContext, useCallback, useState, useEffect, useContext, useMemo } from 'react';
import { useHistory } from 'react-router-dom';
import * as S from './PageEditor.styled';
import { useTheme } from 'styled-components';
import { AnimatePresence } from 'framer-motion';

// Deps
import { useAlert } from 'react-alert';
import { pageIsPublished } from 'utilities/editPageGetSuccessMessage';

// CSS files for libraries that ARE ONLY needed for page edit
import 'react-datepicker/dist/react-datepicker.css';

// Routing
import { useParams } from 'react-router-dom';

// AJAX
import useRequest from 'hooks/useRequest';
import { LIST_STYLES } from 'ajax/endpoints';

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
import useContributionPage from 'hooks/useContributionPage/useContributionPage';
import ElementErrors from './ElementErrors';

export const PageEditorContext = createContext();
export const usePageEditorContext = () => useContext(PageEditorContext);

export const EDIT = 'EDIT';
export const PREVIEW = 'PREVIEW';

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
  const alert = useAlert();
  const theme = useTheme();
  const parameters = useParams();
  const getUserConfirmation = useConfirmationModalContext();
  const [selectedButton, setSelectedButton] = useState(PREVIEW);
  const [showEditInterface, setShowEditInterface] = useState(false);
  const [stylesLoading, setStylesLoading] = useState(false);
  const [elementErrors, setElementErrors] = useState([]);
  const { page: pageContext, setPage: baseSetPageContext, updatedPage, setUpdatedPage } = usePageContext();
  const { deletePage, error, isError, isLoading, page, updatePage } = useContributionPage(
    parameters.revProgramSlug,
    parameters.pageSlug
  );
  const [availableStyles, setAvailableStyles] = useState([]);
  const requestGetPageStyles = useRequest();
  const history = useHistory();
  useWebFonts(page?.styles?.font);

  useConfigureAnalytics();

  // Page data may have a null currency property if Stripe hasn't been
  // connected yet. We want to force it to always at least contain a plausible
  // currency symbol while the user is editing.
  //
  // We shouldn't have this logic on a live page--Stripe should always be
  // connected in that case.
  //
  // We need this in the setter because other components may call it.

  const setPageContext = useCallback(
    (value) => {
      // Need this comparison instead of spreading directly because currency may
      // be null.

      if (!value || value.currency) {
        baseSetPageContext(value);
      } else {
        baseSetPageContext({ ...value, currency: { code: 'USD', symbol: '$' } });
      }
    },
    [baseSetPageContext]
  );

  // Reset page context when loading the page begins.

  useEffect(() => {
    if (isLoading && pageContext !== null) {
      setPageContext(null);
      setUpdatedPage(null);
    }
  }, [isLoading, pageContext, setPageContext, setUpdatedPage]);

  // Show fetch errors to the user. A timeout of 0 means that the alerts must be
  // manually closed by the user instead of disappearing after a delay.

  useEffect(() => {
    if (isError && error.response?.data) {
      alert.error(error.response.data.detail, { timeout: 0 });
    }
  }, [alert, error?.response.data, isError]);

  // Once the page is successfully loaded, set up local state and go into edit
  // mode.

  useEffect(() => {
    if (!isLoading && !error) {
      setPageContext(page);
      handleEdit();
    }
  }, [error, isLoading, page, setPageContext, setUpdatedPage]);

  // Show validation errors.

  useEffect(() => {
    if (elementErrors.length > 0) {
      alert.error(<ElementErrors errors={elementErrors} />, { timeout: 0 });
    }
  }, [alert, elementErrors]);

  const pageTitle = useMemo(
    () =>
      `Edit | ${page?.name ? `${page?.name} | ` : ''}${
        page?.revenue_program?.name ? `${page?.revenue_program?.name}` : ''
      }`,
    [page?.name, page?.revenue_program?.name]
  );

  // Load available styles.

  useEffect(() => {
    const rpId = page?.revenue_program?.id;

    if (rpId) {
      setStylesLoading(true);
      requestGetPageStyles(
        { method: 'GET', url: LIST_STYLES, params: { revenue_program: rpId } },
        {
          onSuccess: ({ data }) => {
            setAvailableStyles(data);
            setStylesLoading(false);
          },
          onFailure: () => {
            setStylesLoading(false);
          }
        }
      );
    }
  }, [page, requestGetPageStyles]);

  // Event handlers.

  const handleDelete = () => {
    if (!deletePage) {
      // This should never happen--see conditional logic on the delete button below.
      throw new Error("Can't delete this page");
    }

    async function finishDelete() {
      try {
        await deletePage();
        history.push(CONTENT_SLUG);
      } catch {
        // Do nothing--deletePage() will display an alert to the user for us.
      }
    }

    if (pageIsPublished(page)) {
      getUserConfirmation(DELETE_LIVE_PAGE_CONFIRM_TEXT, finishDelete);
    } else {
      finishDelete();
    }
  };

  const handleEdit = () => {
    setSelectedButton(EDIT);
    setShowEditInterface(true);
  };

  const handlePreview = () => {
    setSelectedButton(PREVIEW);
    setShowEditInterface(false);
  };

  const handleSave = () => {
    async function finishSave() {
      try {
        if (CAPTURE_PAGE_SCREENSHOT) {
          await updatePage(updatedPage, document.getElementById('root'));
        } else {
          await updatePage(updatedPage);
        }

        setElementErrors({});
        setUpdatedPage({});
        handlePreview();
      } catch (error) {
        // We might have received element validation errors. If so, force the
        // edit interface open.

        if (error.response?.data) {
          setElementErrors((existing) => ({ ...existing, ...error.response.data }));
          handleEdit();
        } else {
          // Something else went wrong, like the API is not available. Just show
          // an error notification and leave edit mode.

          console.error(error);
          alert.error(GENERIC_ERROR);
          handlePreview();
        }
      }
    }

    const { elementErrors } = validatePage(updatedPage);

    if (elementErrors?.length > 0) {
      setElementErrors(elementErrors);
    } else if (pageIsPublished(page)) {
      getUserConfirmation("You're making changes to a live contribution page. Continue?", finishSave);
    } else {
      finishSave();
    }
  };

  return (
    <>
      <PageTitle title={pageTitle} />
      <PageEditorContext.Provider
        value={{
          page: pageContext,
          setPage: setPageContext,
          availableStyles,
          setAvailableStyles,
          showEditInterface,
          setShowEditInterface,
          setSelectedButton,
          errors: elementErrors
        }}
      >
        <S.PageEditor data-testid="page-editor">
          {(isLoading || stylesLoading) && <GlobalLoading />}
          {showEditInterface && (
            <AnimatePresence>
              <EditInterface />
            </AnimatePresence>
          )}
          {!isLoading && !stylesLoading && pageContext && (
            <SegregatedStyles page={page}>
              {/* set stringified page as key to guarantee that ALL page changes will re-render the page in edit mode */}
              <DonationPage key={page ? JSON.stringify(page) : ''} live={false} page={pageContext} />
            </SegregatedStyles>
          )}

          {pageContext && (
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
                    <S.DisabledSaveIcon icon={faSave} type="neutral" disabled={isLoading || stylesLoading} />
                  </S.PageEditorBackButton>
                </Tooltip>
              )}
              <CircleButton
                onClick={handleDelete}
                icon={faTrash}
                buttonType="caution"
                data-testid="delete-page-button"
                disabled={!deletePage}
                tooltipText="Delete"
              />
            </S.ButtonOverlay>
          )}
        </S.PageEditor>
      </PageEditorContext.Provider>
    </>
  );
}

export default PageEditor;
