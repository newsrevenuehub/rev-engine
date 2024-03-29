import userEvent from '@testing-library/user-event';
import { EditablePageContext, EditablePageContextResult } from 'hooks/useEditablePage';
import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import { ElementEditor, ElementEditorProps } from './ElementEditor';

jest.mock('./pageElements/ElementProperties');
jest.mock('../elementEditors');

const page = {
  elements: [
    { content: 'layout-element-content', type: 'DAmount', uuid: 'layout-damount-uuid' },
    { content: 'layout-element-content', type: 'DReason', uuid: 'layout-dreason-uuid' },
    {
      content: [{ isDefault: true, value: 'one_time' }],
      type: 'DFrequency',
      uuid: 'layout-dfrequency-uuid'
    }
  ],
  sidebar_elements: [
    { content: 'sidebar-element-content', type: 'DAmount', uuid: 'sidebar-damount-uuid' },
    {
      content: [{ isDefault: true, value: 'one_time' }],
      type: 'DFrequency',
      uuid: 'sidebar-dfrequency-uuid'
    }
  ]
};

function tree(props?: Partial<ElementEditorProps>, context?: Partial<EditablePageContextResult>) {
  return render(
    <EditablePageContext.Provider
      value={{
        deletePage: jest.fn(),
        isError: false,
        isLoading: false,
        page: page as any,
        pageChanges: {},
        setPageChanges: jest.fn(),
        updatedPagePreview: page as any,
        ...context
      }}
    >
      <ElementEditor elementUuid="layout-damount-uuid" location="layout" onClose={jest.fn()} {...props} />
    </EditablePageContext.Provider>
  );
}

describe('ElementEditor', () => {
  it('displays nothing if there is no updated page preview in context', () => {
    tree({}, { updatedPagePreview: undefined });
    expect(document.body).toHaveTextContent('');
  });

  it("displays nothing if the element UUID prop doesn't match an element", () => {
    tree({ elementUuid: 'nonexistent' });
    expect(document.body).toHaveTextContent('');
  });

  it('displays an amount editor if the element to edit is a DAmount', () => {
    tree();

    const editor = screen.getByTestId('mock-amount-editor');

    expect(editor).toBeInTheDocument();
    expect(editor.dataset.content).toBe(JSON.stringify(page.elements[0].content));
  });

  it('displays a reason editor if the element to edit is a DReason', () => {
    tree({ elementUuid: 'layout-dreason-uuid' });

    const editor = screen.getByTestId('mock-reason-editor');

    expect(editor).toBeInTheDocument();
    expect(editor.dataset.content).toBe(JSON.stringify(page.elements[0].content));
  });

  it('uses the correct list of elements when asked to display a sidebar element', () => {
    tree({ elementUuid: 'sidebar-damount-uuid', location: 'sidebar' });

    const editor = screen.getByTestId('mock-amount-editor');

    expect(editor).toBeInTheDocument();
    expect(editor.dataset.content).toBe(JSON.stringify(page.sidebar_elements[0].content));
  });

  it('updates the elementContent prop it gives editors when the editor makes a change', () => {
    tree();
    userEvent.click(screen.getByText('onChangeElementContent'));
    expect(screen.getByTestId('mock-amount-editor').dataset.content).toBe(JSON.stringify({ mockChange: true }));
  });

  describe('The cancel button', () => {
    it('is enabled even when there are no pending changes', () => {
      tree();
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeEnabled();
    });

    it('is enabled when there are pending changes', () => {
      tree();
      userEvent.click(screen.getByText('onChangeElementContent'));
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeEnabled();
    });

    it('calls the onClose prop when clicked', () => {
      const onClose = jest.fn();

      tree({ onClose });
      expect(onClose).not.toBeCalled();
      userEvent.click(screen.getByText('onChangeElementContent'));
      userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(onClose).toBeCalledTimes(1);
    });

    it('resets previous changes when clicked', () => {
      tree();

      const editor = screen.getByTestId('mock-amount-editor');

      userEvent.click(screen.getByText('onChangeElementContent'));
      expect(screen.getByTestId('mock-amount-editor').dataset.content).toBe(JSON.stringify({ mockChange: true }));
      userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(editor.dataset.content).toBe(JSON.stringify(page.elements[0].content));
    });
  });

  describe('the Update button', () => {
    it('is disabled if an editor calls setUpdateDisabled(true)', () => {
      tree();
      userEvent.click(screen.getByText('setUpdateDisabled true'));
      expect(screen.getByRole('button', { name: 'Update' })).toBeDisabled();
    });

    it('is enabled if an editor calls setUpdateDisabled(false)', () => {
      tree();
      userEvent.click(screen.getByText('setUpdateDisabled true'));
      userEvent.click(screen.getByText('setUpdateDisabled false'));
      expect(screen.getByRole('button', { name: 'Update' })).toBeEnabled();
    });

    it('sets changes in the editable page context when clicked', () => {
      const setPageChanges = jest.fn();

      tree({}, { setPageChanges });
      userEvent.click(screen.getByText('onChangeElementContent'));
      userEvent.click(screen.getByText('onChangeElementRequiredFields'));
      expect(setPageChanges).not.toBeCalled();
      userEvent.click(screen.getByRole('button', { name: 'Update' }));
      expect(setPageChanges).toBeCalledTimes(1);
      expect(setPageChanges.mock.lastCall[0](page)).toEqual({
        ...page,
        elements: [
          { ...page.elements[0], content: { mockChange: true }, requiredFields: ['mockChange'] },
          page.elements[1],
          page.elements[2]
        ]
      });
    });

    it('sets changes in the sidebar element list in the editable page context when clicked', () => {
      const setPageChanges = jest.fn();

      tree({ location: 'sidebar', elementUuid: 'sidebar-damount-uuid' }, { setPageChanges });
      userEvent.click(screen.getByText('onChangeElementContent'));
      userEvent.click(screen.getByText('onChangeElementRequiredFields'));
      expect(setPageChanges).not.toBeCalled();
      userEvent.click(screen.getByRole('button', { name: 'Update' }));
      expect(setPageChanges).toBeCalledTimes(1);
      expect(setPageChanges.mock.lastCall[0](page)).toEqual({
        ...page,
        sidebar_elements: [
          { ...page.sidebar_elements[0], content: { mockChange: true }, requiredFields: ['mockChange'] },
          page.sidebar_elements[1]
        ]
      });
    });

    it('calls the onClose prop when clicked', () => {
      const onClose = jest.fn();

      tree({ onClose });
      expect(onClose).not.toBeCalled();
      userEvent.click(screen.getByText('onChangeElementContent'));
      userEvent.click(screen.getByRole('button', { name: 'Update' }));
      expect(onClose).toBeCalledTimes(1);
    });
  });

  it("displays ElementProperties with the correct type if the element to edit isn't a DAmount or DReason", () => {
    tree({ elementUuid: 'layout-dfrequency-uuid', location: 'layout' });

    const properties = screen.getByTestId('mock-element-properties');

    expect(properties).toBeInTheDocument();
    expect(properties.dataset.selectedElementType).toBe('layout');
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
