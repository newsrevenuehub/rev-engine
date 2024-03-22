import { createContext, useState, useEffect, useContext, useMemo, useRef } from 'react';
import { useHistory } from 'react-router-dom';
import * as S from './PageEditor.styled';
import { useTheme } from 'styled-components';
import { AnimatePresence } from 'framer-motion';

// Deps
import { useAlert } from 'react-alert';
import { pageIsPublished } from 'utilities/editPageGetSuccessMessage';

// AJAX
import useRequest from 'hooks/useRequest';
import { LIST_STYLES } from 'ajax/endpoints';

// Routes
import { CONTENT_SLUG } from 'routes';

// Constants
import { DELETE_LIVE_PAGE_CONFIRM_TEXT, GENERIC_ERROR } from 'constants/textConstants';

// Settings
import { CAPTURE_PAGE_SCREENSHOT } from 'appSettings';

// Context
import { useConfirmationModalContext } from 'elements/modal/GlobalConfirmationModal';
import validatePage from './validatePage';

// Hooks
import useWebFonts from 'hooks/useWebFonts';
import { useEditablePageContext } from 'hooks/useEditablePage';
import { useConfigureAnalytics } from 'components/analytics';

// Children
import SegregatedStyles from 'components/donationPage/SegregatedStyles';
import ContributionPage18nProvider from 'components/donationPage/ContributionPageI18nProvider';
import DonationPage from 'components/donationPage/DonationPage';
import GlobalLoading from 'elements/GlobalLoading';
import InnerEditInterface from 'components/pageEditor/editInterface/EditInterface';
import PageTitle from 'elements/PageTitle';
import ElementErrors from './ElementErrors';
import { PageEditorToolbar } from './PageEditorToolbar';

export const PageEditorContext = createContext();
export const usePageEditorContext = () => useContext(PageEditorContext);

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
  const getUserConfirmation = useConfirmationModalContext();
  const [selectedButton, setSelectedButton] = useState(null);
  const [showEditInterface, setShowEditInterface] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [stylesLoading, setStylesLoading] = useState(false);
  const [elementErrors, setElementErrors] = useState([]);
  const {
    deletePage,
    error,
    isError,
    isLoading,
    page,
    savePageChanges,
    pageChanges,
    setPageChanges,
    updatedPagePreview
  } = useEditablePageContext();
  const donationPageRef = useRef();
  const [availableStyles, setAvailableStyles] = useState([]);
  const requestGetPageStyles = useRequest();
  const history = useHistory();
  useWebFonts(updatedPagePreview?.styles?.font);

  useConfigureAnalytics();

  // Show fetch errors to the user. A timeout of 0 means that the alerts must be
  // manually closed by the user instead of disappearing after a delay.

  useEffect(() => {
    if (isError && error.response?.data) {
      alert.error(error.response.data.detail, { timeout: 0 });
    }
  }, [alert, error?.response.data, isError]);

  // Once the page is successfully loaded, go into edit mode.

  useEffect(() => {
    if (!isLoading && !error) {
      handleEdit();
    }
  }, [error, isLoading]);

  // Show validation errors.

  useEffect(() => {
    if (elementErrors.length > 0) {
      alert.error(<ElementErrors errors={elementErrors} />, { timeout: 0 });
    }
  }, [alert, elementErrors]);

  const pageTitle = useMemo(
    () =>
      `Edit | ${updatedPagePreview?.name ? `${updatedPagePreview?.name} | ` : ''}${
        updatedPagePreview?.revenue_program?.name ? `${updatedPagePreview?.revenue_program?.name}` : ''
      }`,
    [updatedPagePreview?.name, updatedPagePreview?.revenue_program?.name]
  );

  // Load available styles.

  useEffect(() => {
    const rpId = updatedPagePreview?.revenue_program?.id;

    // If the revenue program of the page is either available after loading or
    // has changed, load styles associated with the RP.

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
  }, [requestGetPageStyles, updatedPagePreview?.revenue_program?.id]);

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
    setSelectedButton('edit');
    setShowEditInterface(true);
  };

  const handlePreview = () => {
    setSelectedButton('preview');
    setShowEditInterface(false);
  };

  const handleSave = () => {
    async function finishSave() {
      setIsSaving(true);

      try {
        if (CAPTURE_PAGE_SCREENSHOT) {
          await savePageChanges({}, updatedPagePreview.name, donationPageRef?.current);
        } else {
          await savePageChanges();
        }

        setElementErrors({});
        setPageChanges({});
        handlePreview();
        setIsSaving(false);
      } catch (error) {
        setIsSaving(false);

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

    const { elementErrors } = validatePage(pageChanges);

    if (elementErrors?.length > 0) {
      setElementErrors(elementErrors);
    } else if (pageIsPublished(updatedPagePreview)) {
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
          availableStyles,
          setAvailableStyles,
          showEditInterface,
          setShowEditInterface,
          setSelectedButton,
          errors: elementErrors
        }}
      >
        <S.PageEditor data-testid="page-editor">
          {(isLoading || isSaving || stylesLoading) && <GlobalLoading />}
          {page && showEditInterface && (
            <AnimatePresence>
              <InnerEditInterface />
            </AnimatePresence>
          )}
          {updatedPagePreview && (
            <SegregatedStyles page={updatedPagePreview}>
              <ContributionPage18nProvider page={updatedPagePreview}>
                {/* set stringified page as key to guarantee that ALL page changes will re-render the page in edit mode */}
                <DonationPage
                  key={JSON.stringify(updatedPagePreview ?? '')}
                  live={false}
                  page={updatedPagePreview}
                  ref={donationPageRef}
                />
              </ContributionPage18nProvider>
            </SegregatedStyles>
          )}
          {page && (
            <S.ButtonOverlay>
              <PageEditorToolbar
                onDelete={handleDelete}
                onEdit={handleEdit}
                onPreview={handlePreview}
                onSave={handleSave}
                saveDisabled={Object.keys(pageChanges).length === 0}
                selected={selectedButton}
              />
            </S.ButtonOverlay>
          )}
        </S.PageEditor>
      </PageEditorContext.Provider>
    </>
  );
}

export default PageEditor;
