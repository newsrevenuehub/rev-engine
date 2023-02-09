import { useState, useContext, createContext, useEffect, useCallback } from 'react';
import { Root, TabPanel } from './EditInterface.styled';

import { usePageEditorContext } from 'components/pageEditor/PageEditor';

// Util
import isEmpty from 'lodash.isempty';

// Children
import EditInterfaceTabs, { EDIT_INTERFACE_TAB_NAMES } from 'components/pageEditor/editInterface/EditInterfaceTabs';
import ElementProperties from 'components/pageEditor/editInterface/pageElements/ElementProperties';
import AddElementModal from 'components/pageEditor/editInterface/pageElements/addElementModal/AddElementModal';

import PageElements from 'components/pageEditor/editInterface/pageElements/PageElements';
import PageSetup, { PAGE_SETUP_FIELDS } from 'components/pageEditor/editInterface/pageSetup/PageSetup';
import PageSidebarElements from 'components/pageEditor/editInterface/pageSidebarElements/PageSidebarElements';
import PageStyles from 'components/pageEditor/editInterface/pageStyles/PageStyles';
import { useEditablePageContext } from 'hooks/useEditablePage';

import * as dynamicPageElements from 'components/donationPage/pageContent/dynamicElements';
import * as dynamicSidebarElements from 'components/donationPage/pageContent/dynamicSidebarElements';

const dynamicElements = { ...dynamicPageElements, ...dynamicSidebarElements };

const editInterfaceAnimation = {
  initial: { opacity: 0, x: 200 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 200 }
};

export const EditInterfaceContext = createContext();

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
  const { page, setPageChanges } = useEditablePageContext();
  const { errors, showEditInterface, setSelectedButton } = usePageEditorContext();
  const [tab, setTab] = useState(0);
  const [elementDestination, setElementDestination] = useState();
  const [addElementModalOpen, setAddElementModalOpen] = useState(false);
  const [selectedElement, setSelectedElement] = useState();
  const [selectedElementType, setSelectedElementType] = useState();

  // Since you can only edit one element at a time, it's safe (and much easier)
  // to only store one set of "unconfirmed" changes at a time.
  const [elementContent, setElementContent] = useState();
  const [elementRequiredFields, setElementRequiredFields] = useState([]);

  /**
   * This method exists to acknowledge potential additional complexity. Lucky for this developer,
   * there is not currently a scenario where validation errors will come back for somewhere other
   * than the Setup tab.
   */
  const setTabFromErrors = useCallback((errorsObj) => {
    const firstError = Object.keys(errorsObj)[0];
    if (PAGE_SETUP_FIELDS.includes(firstError)) {
      const setupTab = EDIT_INTERFACE_TAB_NAMES.indexOf('Setup');
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
    setPageChanges((existing) => ({ ...existing, ...content }));
  };

  const setElements = (elements) => {
    setPageContent({ elements });
  };

  const setSidebarElements = (sidebar_elements) => {
    setPageContent({ sidebar_elements });
  };

  const handleRemoveElement = (element, elementsType) => {
    if (!dynamicElements[element.type]?.required) {
    }
    if (elementsType === 'layout') {
      const elementsWithout = page?.elements?.filter((el) => el.uuid !== element.uuid);
      setPageContent({ elements: elementsWithout });
    }

    if (elementsType === 'sidebar') {
      const elementsWithout = page?.sidebar_elements?.filter((el) => el.uuid !== element.uuid);
      setPageContent({ sidebar_elements: elementsWithout });
    }
  };

  const goToProperties = (element, elementsType) => {
    setSelectedElementType(elementsType);
    setSelectedElement(element);
    setElementContent(element.content);
    setElementRequiredFields(element.requiredFields || []);
  };

  return (
    <EditInterfaceContext.Provider
      value={{
        elements: page.elements,
        setElements,
        selectedElement,
        sidebarElements: page.sidebar_elements,
        setSidebarElements,
        setSelectedElement,
        elementContent,
        setElementContent,
        elementRequiredFields,
        setElementRequiredFields,
        setPageContent,
        handleRemoveElement
      }}
    >
      <>
        <Root {...editInterfaceAnimation} data-testid="edit-interface">
          {selectedElement ? (
            <ElementProperties selectedElementType={selectedElementType} />
          ) : (
            <>
              <EditInterfaceTabs tab={tab} onChangeTab={setTab} />
              <TabPanel
                active={tab === 0}
                id="edit-layout-tab-panel"
                tabId="edit-layout-tab"
                unmountChildrenWhenInactive
              >
                <PageElements
                  openAddElementModal={() => {
                    setElementDestination('layout');
                    setAddElementModalOpen(true);
                  }}
                  goToProperties={goToProperties}
                  handleRemoveElement={handleRemoveElement}
                />
              </TabPanel>
              <TabPanel
                active={tab === 1}
                id="edit-sidebar-tab-panel"
                tabId="edit-sidebar-tab"
                unmountChildrenWhenInactive
              >
                <PageSidebarElements
                  goToProperties={goToProperties}
                  handleRemoveElement={handleRemoveElement}
                  openAddElementModal={() => {
                    setElementDestination('sidebar');
                    setAddElementModalOpen(true);
                  }}
                />
              </TabPanel>
              <TabPanel active={tab === 2} id="edit-setup-tab-panel" tabId="edit-setup-tab">
                <PageSetup />
              </TabPanel>
              <TabPanel active={tab === 3} id="edit-styles-tab-panel" tabId="edit-styles-tab">
                <PageStyles />
              </TabPanel>
            </>
          )}
        </Root>
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
