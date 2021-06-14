import { useState, useContext, createContext } from 'react';
import * as S from './EditInterface.styled';

import { usePageEditorContext } from 'components/pageEditor/PageEditor';

// Children
import EditInterfaceTabs from 'components/pageEditor/editInterface/EditInterfaceTabs';
import PageElements from 'components/pageEditor/editInterface/PageElements';
import ElementProperties from 'components/pageEditor/editInterface/ElementProperties';
import PageSetup from 'components/pageEditor/editInterface/PageSetup';
import AddElementModal from 'components/pageEditor/editInterface/addElementModal/AddElementModal';

const editInterfaceAnimation = {
  initial: { opacity: 0, x: 200 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 200 }
};

const EditInterfaceContext = createContext();

function EditInterface() {
  const { page, setPage, updatedPage, setUpdatedPage } = usePageEditorContext();
  const [tab, setTab] = useState(0);
  const [addElementModalOpen, setAddElementModalOpen] = useState(false);
  const [selectedElement, setSelectedElement] = useState();
  const [elementContent, setElementContent] = useState();

  const setElements = (elements) => {
    setPage({ ...page, elements });
    setUpdatedPage({ ...updatedPage, elements });
  };

  const goToProperties = (element) => {
    setSelectedElement(element);
    setElementContent(element.content);
  };

  return (
    <EditInterfaceContext.Provider
      value={{
        page,
        elements: page.elements,
        setElements,
        selectedElement,
        setSelectedElement,
        elementContent,
        setElementContent
      }}
    >
      <>
        <S.EditInterface {...editInterfaceAnimation}>
          {selectedElement ? (
            <ElementProperties />
          ) : (
            <>
              <EditInterfaceTabs tab={tab} setTab={setTab} />
              {tab === 0 && (
                <PageElements
                  openAddElementModal={() => setAddElementModalOpen(true)}
                  goToProperties={goToProperties}
                />
              )}
              {tab === 1 && <PageSetup page={page} />}
            </>
          )}
        </S.EditInterface>
        <AddElementModal addElementModalOpen={addElementModalOpen} setAddElementModalOpen={setAddElementModalOpen} />
      </>
    </EditInterfaceContext.Provider>
  );
}

export const useEditInterfaceContext = () => useContext(EditInterfaceContext);

export default EditInterface;
