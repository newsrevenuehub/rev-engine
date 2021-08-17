import { useState, useContext, createContext, useEffect, useCallback } from 'react';
import * as S from './EditInterface.styled';

import { usePageEditorContext } from 'components/pageEditor/PageEditor';

// Util
import isEmpty from 'lodash.isempty';

// Children
import EditInterfaceTabs, { EDIT_INTERFACE_TABS } from 'components/pageEditor/editInterface/EditInterfaceTabs';
import ElementProperties from 'components/pageEditor/editInterface/pageElements/ElementProperties';
import AddElementModal from 'components/pageEditor/editInterface/pageElements/addElementModal/AddElementModal';

import PageElements from 'components/pageEditor/editInterface/pageElements/PageElements';
import PageSetup, { PAGE_SETUP_FIELDS } from 'components/pageEditor/editInterface/pageSetup/PageSetup';
import PageSidebarElements from 'components/pageEditor/editInterface/pageSidebarElements/PageSidebarElements';
import PageStyles from 'components/pageEditor/editInterface/pageStyles/PageStyles';

const editInterfaceAnimation = {
  initial: { opacity: 0, x: 200 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 200 }
};

const EditInterfaceContext = createContext();

/**
 * EditInterface
 * EditInterface renders the Sidebar in the PageEdit view. It maintains state for elements
 * in element tab, as well as the state of the tabs themselves. It also renders and controls
 * the state of the AddElementModal. It swaps PageElements for ElementProperties when a Page
 * Element is selected.
 *
 * EditInterface is direct child of PageEditor
 */
function EditInterface() {
  const {
    page,
    setPage,
    updatedPage,
    setUpdatedPage,
    errors,
    showEditInterface,
    setSelectedButton
  } = usePageEditorContext();
  const [tab, setTab] = useState(0);
  const [elementDestination, setElementDestination] = useState();
  const [addElementModalOpen, setAddElementModalOpen] = useState(false);
  const [selectedElement, setSelectedElement] = useState();
  const [selectedElementType, setSelectedElementType] = useState();

  // Since you can only edit one element at a time, it's safe (and much easier)
  // to only store one set of "unconfirmed" changes at a time.
  const [elementContent, setElementContent] = useState();

  /**
   * This method exists to acknowledge potential additional complexity. Lucky for this developer,
   * there is not currently a scenario where validation errors will come back for somewhere other
   * than the Setup tab.
   */
  const setTabFromErrors = useCallback((errorsObj) => {
    const firstError = Object.keys(errorsObj)[0];
    if (PAGE_SETUP_FIELDS.includes(firstError)) {
      const setupTab = EDIT_INTERFACE_TABS.indexOf('Setup');
      setTab(setupTab);
    }
  }, []);

  /**
   * If we have errors, open edit interface and set tab based on value in errors.
   */
  useEffect(() => {
    if (!isEmpty(errors)) {
      setTabFromErrors(errors);
    }
  }, [errors, setTabFromErrors, setSelectedButton, showEditInterface]);

  /**
   * setPageContent performs updates necessary to affect a change made in
   * the edit interface.
   */
  const setPageContent = (content = {}) => {
    setPage({ ...page, ...content });
    setUpdatedPage({ ...updatedPage, ...content });
  };

  const setElements = (elements) => {
    setPageContent({ elements });
  };

  const setSidebarElements = (sidebar_elements) => {
    setPageContent({ sidebar_elements });
  };

  const goToProperties = (element, elementsType) => {
    setSelectedElementType(elementsType);
    setSelectedElement(element);
    setElementContent(element.content);
  };

  return (
    <EditInterfaceContext.Provider
      value={{
        page,
        updatedPage,
        elements: page.elements,
        setElements,
        selectedElement,
        sidebarElements: page.sidebar_elements,
        setSidebarElements,
        setSelectedElement,
        elementContent,
        setElementContent,
        setPageContent
      }}
    >
      <>
        <S.EditInterface {...editInterfaceAnimation} data-testid="edit-interface">
          {selectedElement ? (
            <ElementProperties selectedElementType={selectedElementType} />
          ) : (
            <>
              <EditInterfaceTabs tab={tab} setTab={setTab} />
              {tab === 0 && (
                <PageElements
                  openAddElementModal={() => {
                    setElementDestination('layout');
                    setAddElementModalOpen(true);
                  }}
                  goToProperties={goToProperties}
                />
              )}
              {tab === 1 && (
                <PageSidebarElements
                  goToProperties={goToProperties}
                  openAddElementModal={() => {
                    setElementDestination('sidebar');
                    setAddElementModalOpen(true);
                  }}
                />
              )}
              {tab === 2 && <PageSetup backToProperties={() => setTab(0)} />}
              {tab === 3 && <PageStyles backToProperties={() => setTab(0)} />}
            </>
          )}
        </S.EditInterface>
        <AddElementModal
          addElementModalOpen={addElementModalOpen}
          setAddElementModalOpen={setAddElementModalOpen}
          destination={elementDestination}
        />
      </>
    </EditInterfaceContext.Provider>
  );
}

export const useEditInterfaceContext = () => useContext(EditInterfaceContext);

export default EditInterface;
