import { EditablePageContext, EditablePageContextResult } from 'hooks/useEditablePage';
import { fireEvent, render, screen } from 'test-utils';
import { EditInterfaceContextProvider, useEditInterfaceContext } from './EditInterfaceContextProvider';

function TestEditInterfaceContextConsumer() {
  const {
    elementContent,
    elementRequiredFields,
    elements,
    handleRemoveElement,
    selectedElement,
    setElementContent,
    setElementRequiredFields,
    setElements,
    setSelectedElement,
    sidebarElements,
    setSidebarElements
  } = useEditInterfaceContext();

  return (
    <>
      <div data-testid="elements">{JSON.stringify(elements)}</div>
      <div data-testid="elementContent">{JSON.stringify(elementContent)}</div>
      <div data-testid="elementRequiredFields">{JSON.stringify(elementRequiredFields)}</div>
      <div data-testid="selectedElement">{JSON.stringify(selectedElement)}</div>
      <div data-testid="sidebarElements">{JSON.stringify(sidebarElements)}</div>
      <button onClick={() => handleRemoveElement({ uuid: 'test-uuid' } as any, 'layout')}>
        handleRemoveElement layout
      </button>
      <button onClick={() => handleRemoveElement({ type: 'DAmount', uuid: 'test-uuid' } as any, 'layout')}>
        handleRemoveElement layout required
      </button>
      <button onClick={() => handleRemoveElement({ uuid: 'test-uuid' } as any, 'sidebar')}>
        handleRemoveElement sidebar
      </button>
      <button onClick={() => handleRemoveElement({ type: 'DAmount', uuid: 'test-uuid' } as any, 'sidebar')}>
        handleRemoveElement sidebar required
      </button>
      <button onClick={() => setElements([{ changedElements: true }] as any)}>setElements</button>
      <button onClick={() => setElementContent({ changedElementContent: true } as any)}>setElementContent</button>
      <button onClick={() => setElementRequiredFields(['changedRequiredFields'])}>setElementRequiredFields</button>
      <button onClick={() => setSelectedElement({ changedSelectedElement: true } as any)}>setSelectedElement</button>
      <button onClick={() => setSidebarElements([{ changedSidebarElements: true }] as any)}>setSidebarElements</button>
    </>
  );
}

describe('EditInterfaceContextProvider', () => {
  function tree(context?: Partial<EditablePageContextResult>) {
    return render(
      <EditablePageContext.Provider
        value={{
          deletePage: jest.fn(),
          isError: false,
          isLoading: false,
          page: {} as any,
          pageChanges: {},
          setPageChanges: jest.fn(),
          ...context
        }}
      >
        <EditInterfaceContextProvider>
          children
          <TestEditInterfaceContextConsumer />
        </EditInterfaceContextProvider>
      </EditablePageContext.Provider>
    );
  }

  it("has an elements property that reflects the editable page's preview, not the page", () => {
    const elements = [{ preview: true }];

    tree({ page: { elements: [{ old: true }] }, updatedPagePreview: { elements } } as any);
    expect(screen.getByTestId('elements')).toHaveTextContent(JSON.stringify(elements));
  });

  it('adds a page change to elements when setElements is called, preserving unrelated changes', () => {
    const setPageChanges = jest.fn();

    tree({ setPageChanges });
    expect(setPageChanges).not.toBeCalled();
    fireEvent.click(screen.getByText('setElements'));
    expect(setPageChanges).toBeCalledTimes(1);
    expect(setPageChanges.mock.calls[0][0]({ existing: true })).toEqual({
      existing: true,
      elements: [{ changedElements: true }]
    });
  });

  it("has an sidebarElements property that reflects the editable page's preview, not the page", () => {
    const sidebar_elements = [{ preview: true }];

    tree({ page: { sidebar_elements: [{ old: true }] }, updatedPagePreview: { sidebar_elements } } as any);
    expect(screen.getByTestId('sidebarElements')).toHaveTextContent(JSON.stringify(sidebar_elements));
  });

  it('adds a page change to sidebar_elements when setSidebarElements is called, preserving unrelated changes', () => {
    const setPageChanges = jest.fn();

    tree({ setPageChanges });
    expect(setPageChanges).not.toBeCalled();
    fireEvent.click(screen.getByText('setSidebarElements'));
    expect(setPageChanges).toBeCalledTimes(1);
    expect(setPageChanges.mock.calls[0][0]({ existing: true })).toEqual({
      existing: true,
      sidebar_elements: [{ changedSidebarElements: true }]
    });
  });

  it('has a selected element state that starts undefined', () => {
    tree();
    expect(screen.getByTestId('selectedElement')).toHaveTextContent('');
  });

  it('updates the selected element state when setSelectedElement is called', () => {
    tree();
    fireEvent.click(screen.getByText('setSelectedElement'));
    expect(screen.getByTestId('selectedElement')).toHaveTextContent('{"changedSelectedElement":true}');
  });

  it('has an element content state that starts undefined', () => {
    tree();
    expect(screen.getByTestId('elementContent')).toHaveTextContent('');
  });

  it('updates the element content state when setElementContent is called', () => {
    tree();
    fireEvent.click(screen.getByText('setElementContent'));
    expect(screen.getByTestId('elementContent')).toHaveTextContent('{"changedElementContent":true}');
  });

  it('has an element required fields state that starts as any empty array', () => {
    tree();
    expect(screen.getByTestId('elementRequiredFields')).toHaveTextContent('[]');
  });

  it('updates the element required fields when setElementRequiredFields is called', () => {
    tree();
    fireEvent.click(screen.getByText('setElementRequiredFields'));
    expect(screen.getByTestId('elementRequiredFields')).toHaveTextContent('["changedRequiredFields"]');
  });

  describe('handleRemoveElement', () => {
    it("removes elements from the main page content if passed a 'layout' location, preserving unrelated changes", () => {
      const setPageChanges = jest.fn();

      tree({
        updatedPagePreview: {
          elements: [{ uuid: 'unrelated1' }, { uuid: 'test-uuid' }, { uuid: 'unrelated2' }],
          sidebar_elements: [{ uuid: 'test-uuid' }]
        } as any,
        setPageChanges
      });
      fireEvent.click(screen.getByText('handleRemoveElement layout'));
      expect(setPageChanges).toBeCalledTimes(1);
      expect(setPageChanges.mock.calls[0][0]({ existing: true })).toEqual({
        existing: true,
        elements: [{ uuid: 'unrelated1' }, { uuid: 'unrelated2' }]
      });
    });

    it("removes elements from the sidebar if passaged a 'sidebar' location, preserving unrelated changes", () => {
      const setPageChanges = jest.fn();

      tree({
        updatedPagePreview: {
          elements: [{ uuid: 'test-uuid' }],
          sidebar_elements: [{ uuid: 'unrelated1' }, { uuid: 'test-uuid' }, { uuid: 'unrelated2' }]
        } as any,
        setPageChanges
      });
      fireEvent.click(screen.getByText('handleRemoveElement sidebar'));
      expect(setPageChanges).toBeCalledTimes(1);
      expect(setPageChanges.mock.calls[0][0]({ existing: true })).toEqual({
        existing: true,
        sidebar_elements: [{ uuid: 'unrelated1' }, { uuid: 'unrelated2' }]
      });
    });

    it('does nothing if an element is required', () => {
      const setPageChanges = jest.fn();

      tree({
        updatedPagePreview: {
          elements: [{ type: 'DAmount', uuid: 'test-uuid' }],
          sidebar_elements: [{ type: 'DAmount', uuid: 'test-uuid' }]
        } as any,
        setPageChanges
      });
      expect(setPageChanges).not.toBeCalled();
      fireEvent.click(screen.getByText('handleRemoveElement layout required'));
      expect(setPageChanges).not.toBeCalled();
      fireEvent.click(screen.getByText('handleRemoveElement sidebar required'));
      expect(setPageChanges).not.toBeCalled();
    });

    it("doesn't remove the element if it's not in the location specified", () => {
      const setPageChanges = jest.fn();

      tree({
        updatedPagePreview: {
          elements: [{ uuid: 'unrelated' }],
          sidebar_elements: [{ uuid: 'test-uuid' }]
        } as any,
        setPageChanges
      });
      fireEvent.click(screen.getByText('handleRemoveElement layout'));
      expect(setPageChanges).toBeCalledTimes(1);
      expect(setPageChanges.mock.calls[0][0]({ existing: true })).toEqual({
        existing: true,
        elements: [{ uuid: 'unrelated' }]
      });
    });
  });

  it('displays its children', () => {
    tree();
    expect(screen.getByText('children')).toBeInTheDocument();
  });
});
