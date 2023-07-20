import { useState, useEffect, useCallback } from 'react';
import { Root, TabPanel } from './EditInterface.styled';

import { usePageEditorContext } from 'components/pageEditor/PageEditor';
import { EditInterfaceContextProvider, useEditInterfaceContext } from './EditInterfaceContextProvider';

// Util
import isEmpty from 'lodash.isempty';

// Children
import EditInterfaceTabs, { EDIT_INTERFACE_TAB_NAMES } from 'components/pageEditor/editInterface/EditInterfaceTabs';
import AddElementModal from 'components/pageEditor/editInterface/pageElements/addElementModal/AddElementModal';

import PageElements from 'components/pageEditor/editInterface/pageElements/PageElements';
import PageSetup, { PAGE_SETUP_FIELDS } from 'components/pageEditor/editInterface/pageSetup/PageSetup';
import PageSidebarElements from 'components/pageEditor/editInterface/pageSidebarElements/PageSidebarElements';
import PageStyles from 'components/pageEditor/editInterface/pageStyles/PageStyles';
import { ElementEditor } from './ElementEditor';

const editInterfaceAnimation = {
  initial: { opacity: 0, x: 200 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 200 }
};

/**
 * EditInterface
 * EditInterface renders the Sidebar in the PageEdit view. It maintains state for elements
 * in element tab, as well as the state of the tabs themselves. It also renders and controls
 * the state of the AddElementModal. It swaps PageElements for ElementProperties when a Page
 * Element is selected.
 *
 * EditInterface is direct child of PageEditor
 */
function InnerEditInterface() {
  const { handleRemoveElement, selectedElement, setElementContent, setElementRequiredFields, setSelectedElement } =
    useEditInterfaceContext();
  const { errors, showEditInterface, setSelectedButton } = usePageEditorContext();
  const [tab, setTab] = useState(0);
  const [elementDestination, setElementDestination] = useState();
  const [addElementModalOpen, setAddElementModalOpen] = useState(false);
  const [selectedElementType, setSelectedElementType] = useState();

  /**
   * This method exists to acknowledge potential additional complexity. Lucky for this developer,
   * there is not currently a scenario where validation errors will come back for somewhere other
   * than the Settings tab.
   */
  const setTabFromErrors = useCallback((errorsObj) => {
    const firstError = Object.keys(errorsObj)[0];
    if (PAGE_SETUP_FIELDS.includes(firstError)) {
      setTab(EDIT_INTERFACE_TAB_NAMES.indexOf('Settings'));
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

  const goToProperties = (element, elementsType) => {
    setSelectedElementType(elementsType);
    setSelectedElement(element);
    setElementContent(element.content);
    setElementRequiredFields(element.requiredFields || []);
  };

  return (
    <>
      <Root {...editInterfaceAnimation} data-testid="edit-interface">
        {selectedElement ? (
          <ElementEditor
            elementUuid={selectedElement.uuid}
            location={selectedElementType}
            onClose={() => setSelectedElement()}
          />
        ) : (
          <>
            <EditInterfaceTabs tab={tab} onChangeTab={setTab} />
            <TabPanel active={tab === 0} id="edit-layout-tab-panel" tabId="edit-layout-tab" unmountChildrenWhenInactive>
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
            <TabPanel active={tab === 2} id="edit-settings-tab-panel" tabId="edit-settings-tab">
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
  );
}

function EditInterface() {
  return (
    <EditInterfaceContextProvider>
      <InnerEditInterface />
    </EditInterfaceContextProvider>
  );
}

export default EditInterface;
