import { ContributionPageElement } from 'hooks/useContributionPage';
import { useEditablePageContext } from 'hooks/useEditablePage';
import { createContext, Dispatch, ReactNode, SetStateAction, useCallback, useContext, useState } from 'react';
import * as dynamicPageElements from 'components/donationPage/pageContent/dynamicElements';
import * as dynamicSidebarElements from 'components/donationPage/pageContent/dynamicSidebarElements';

// This is a stopgap measure to improve testability on the edit interface
// context, which is still used by the page content and sidebar editor tabs. The
// goal is to eventually remove this context entirely in favor of
// useEditablePage and useEditablePageBatch.

const dynamicElements = { ...dynamicPageElements, ...dynamicSidebarElements };

export interface UseEditInterfaceContextResult {
  /**
   * Elements in the main page content. Undefined while the page is loading.
   */
  elements?: ContributionPageElement[] | null;
  /**
   * Sets the entire array of main page content elements in the editable page
   * context. Makes no changes in the API.
   */
  setElements: (value: ContributionPageElement[] | undefined) => void;
  /**
   * Elements in the side page content. Undefined while the page is loading.
   */
  sidebarElements?: ContributionPageElement[] | null;
  /**
   * Sets the entire array of sidebar content elements in the editable page
   * context. Makes no changes in the API.
   */
  setSidebarElements: (value: ContributionPageElement[]) => void;
  /**
   * The element currently being edited, if any. (You can only edit one element
   * at a time in this context.)
   */
  selectedElement?: ContributionPageElement;
  /**
   * Setter for the selectedElement.
   */
  setSelectedElement: Dispatch<SetStateAction<ContributionPageElement | undefined>>;
  /**
   * Content of the element currently being edited. (You can only edit one
   * element at a time in this context.)
   */
  elementContent?: ContributionPageElement['content'];
  /**
   * Setter for the element content being edited.
   */
  setElementContent: Dispatch<SetStateAction<ContributionPageElement['content']>>;
  /**
   * What fields are required in the element currently being edited?
   */
  elementRequiredFields: string[];
  /**
   * Setter for required field elements.
   */
  setElementRequiredFields: (value: string[]) => void;
  /**
   * Removes an element from either the main page content or the sidebar in the
   * editable page context. Never makes any API changes. If the element is
   * required, this does nothing.
   */
  handleRemoveElement: (element: ContributionPageElement, location: 'layout' | 'sidebar') => void;
}

export interface EditInterfaceContextProviderProps {
  children: ReactNode;
}

const throwByDefault = () => {
  throw new Error('EditInterfaceContext must be used inside an EditInterfaceContextProvider');
};

export const EditInterfaceContext = createContext<UseEditInterfaceContextResult>({
  setElements: throwByDefault,
  sidebarElements: [],
  setSidebarElements: throwByDefault,
  setElementContent: throwByDefault,
  elementRequiredFields: [],
  setElementRequiredFields: throwByDefault,
  handleRemoveElement: throwByDefault,
  setSelectedElement: throwByDefault
});

export const useEditInterfaceContext = () => useContext(EditInterfaceContext);

export function EditInterfaceContextProvider({ children }: EditInterfaceContextProviderProps) {
  const { setPageChanges, updatedPagePreview } = useEditablePageContext();
  const [selectedElement, setSelectedElement] = useState<ContributionPageElement>();
  const [elementContent, setElementContent] = useState<ContributionPageElement['content']>();
  const [elementRequiredFields, setElementRequiredFields] = useState<string[]>([]);
  const setElements = useCallback(
    (elements: ContributionPageElement[] | undefined) => {
      setPageChanges((existing) => ({ ...existing, elements }));
    },
    [setPageChanges]
  );
  const setSidebarElements = (sidebar_elements: ContributionPageElement[]) => {
    setPageChanges((existing) => ({ ...existing, sidebar_elements }));
  };
  const handleRemoveElement = (element: ContributionPageElement, location: 'layout' | 'sidebar') => {
    if (dynamicElements[element.type]?.required) {
      return;
    }

    if (location === 'layout') {
      setPageChanges((existing) => ({
        ...existing,
        elements: updatedPagePreview?.elements?.filter(({ uuid }) => uuid !== element.uuid)
      }));
    } else if (location === 'sidebar') {
      setPageChanges((existing) => ({
        ...existing,
        sidebar_elements: updatedPagePreview?.sidebar_elements?.filter(({ uuid }) => uuid !== element.uuid)
      }));
    }
  };

  return (
    <EditInterfaceContext.Provider
      value={{
        elementContent,
        elementRequiredFields,
        handleRemoveElement,
        selectedElement,
        setElementContent,
        setElementRequiredFields,
        setSelectedElement,
        setSidebarElements,
        setElements,
        // Temp filtering out DSwag elements in DEV-3733
        // TODO: Re-enable in DEV-3735
        // elements: updatedPagePreview?.elements,
        // sidebarElements: updatedPagePreview?.sidebar_elements
        elements: updatedPagePreview?.elements?.filter(({ type }) => type !== 'DSwag'),
        sidebarElements: updatedPagePreview?.sidebar_elements?.filter(({ type }) => type !== 'DSwag')
      }}
    >
      {children}
    </EditInterfaceContext.Provider>
  );
}
