import { axe } from 'jest-axe';
import { fireEvent, render, screen, waitFor } from 'test-utils';
import PageName from './PageName';
import { useEditablePageContext } from 'hooks/useEditablePage';

jest.mock('hooks/useEditablePage');

function tree() {
  return render(<PageName />);
}

describe('PageName', () => {
  const useEditablePageContextMock = jest.mocked(useEditablePageContext);

  beforeEach(() => {
    useEditablePageContextMock.mockReturnValue({
      deletePage: jest.fn(),
      isError: false,
      isLoading: false,
      pageChanges: {},
      setPageChanges: jest.fn(),
      updatedPagePreview: { name: 'mock-page-name' } as any
    });
  });

  afterEach(() => jest.useRealTimers());

  describe('Noneditable state', () => {
    it('displays nothing if the page preview is not available', () => {
      useEditablePageContextMock.mockReturnValue({
        deletePage: jest.fn(),
        isError: false,
        isLoading: true,
        pageChanges: {},
        setPageChanges: jest.fn()
      });
      tree();
      expect(document.body.textContent).toBe('');
    });

    it("displays a button with the page's current name", () => {
      tree();
      expect(screen.getByRole('button', { name: 'mock-page-name' })).toBeVisible();
    });

    it('gives the button an Edit tooltip', () => {
      tree();
      expect(screen.getByRole('button', { name: 'mock-page-name' })).toHaveAttribute('title', 'Edit');
    });

    it('should not render bookmark icon by default', () => {
      tree();
      expect(screen.queryByTestId('bookmark-icon')).not.toBeInTheDocument();
    });

    it('should render bookmark icon if page id === revenue program default donation page', () => {
      useEditablePageContextMock.mockReturnValue({
        deletePage: jest.fn(),
        isError: false,
        isLoading: false,
        pageChanges: {},
        setPageChanges: jest.fn(),
        updatedPagePreview: { name: 'mock-page-name', id: 1, revenue_program: { default_donation_page: 1 } } as any
      });
      tree();
      expect(screen.getByTestId('bookmark-icon')).toBeInTheDocument();
    });

    it('is accessible', async () => {
      const { container } = tree();

      expect(await axe(container)).toHaveNoViolations();
    });
  });

  describe('Editable state', () => {
    it("shows a text field with the page's current name", () => {
      tree();
      fireEvent.click(screen.getByRole('button', { name: 'mock-page-name' }));

      const field = screen.getByRole('textbox', { name: 'Page Name' });

      expect(field).toBeVisible();
      expect(field).toHaveValue('mock-page-name');
    });

    it('sets the field to an empty value if the page has no name currently', () => {
      useEditablePageContextMock.mockReturnValue({
        deletePage: jest.fn(),
        isError: false,
        isLoading: false,
        pageChanges: {},
        setPageChanges: jest.fn(),
        updatedPagePreview: {} as any
      });
      tree();
      fireEvent.click(screen.getByRole('button'));
      expect(screen.getByRole('textbox', { name: 'Page Name' })).toHaveValue('');
    });

    it('selects the text in the field', async () => {
      tree();
      fireEvent.click(screen.getByRole('button', { name: 'mock-page-name' }));

      // See https://github.com/testing-library/jest-dom/issues/289

      const input = screen.getByRole('textbox', { name: 'Page Name' }) as HTMLInputElement;

      await waitFor(() => expect(input.selectionStart).not.toBe(input.selectionEnd));
      expect(input.selectionStart).toBe(0);
      expect(input.selectionEnd).toBe('mock-page-name'.length);
    });

    it('allows a maximum of 255 characters in the text field', () => {
      tree();
      fireEvent.click(screen.getByRole('button', { name: 'mock-page-name' }));
      fireEvent.change(screen.getByRole('textbox', { name: 'Page Name' }), { target: { value: 'x'.repeat(256) } });
      expect(screen.getByRole('textbox', { name: 'Page Name' })).toHaveValue('x'.repeat(255));
    });

    it('saves changes and goes into the noneditable state when the form is submitted', () => {
      const setPageChanges = jest.fn();

      useEditablePageContextMock.mockReturnValue({
        setPageChanges,
        deletePage: jest.fn(),
        isError: false,
        isLoading: true,
        pageChanges: {},
        updatedPagePreview: { name: 'mock-page-name' } as any
      });
      tree();
      fireEvent.click(screen.getByRole('button', { name: 'mock-page-name' }));
      fireEvent.change(screen.getByRole('textbox', { name: 'Page Name' }), { target: { value: 'new-name' } });
      fireEvent.submit(document.querySelector('form')!);

      // The component uses the setter form, so we need to invoke it manually.

      expect(setPageChanges).toBeCalledTimes(1);
      expect(setPageChanges.mock.calls[0][0]({ existing: true })).toEqual({
        existing: true,
        name: 'new-name'
      });

      // Check that we're back in noneditable state. The button name won't
      // change because we're not mocking that behavior in the editable page
      // context.

      expect(screen.queryByRole('textbox', { name: 'Page Name' })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'mock-page-name' })).toBeVisible();
    });

    it('cancels changes and goes into the noneditable state when the Escape key is pressed', () => {
      const setPageChanges = jest.fn();

      useEditablePageContextMock.mockReturnValue({
        setPageChanges,
        deletePage: jest.fn(),
        isError: false,
        isLoading: true,
        pageChanges: {},
        updatedPagePreview: { name: 'mock-page-name' } as any
      });
      tree();
      fireEvent.click(screen.getByRole('button', { name: 'mock-page-name' }));
      fireEvent.change(screen.getByRole('textbox', { name: 'Page Name' }), { target: { value: 'new-name' } });
      fireEvent.keyUp(screen.getByRole('textbox', { name: 'Page Name' }), { key: 'Escape' });
      expect(setPageChanges).not.toBeCalled();
      expect(screen.queryByRole('textbox', { name: 'Page Name' })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'mock-page-name' })).toBeVisible();
    });

    it('cancels changes and goes into the noneditable state when the user clicks outside the field', () => {
      // Fake timers are needed to test <ClickAwayListener>.
      // See https://github.com/mui/material-ui/issues/24783

      jest.useFakeTimers();

      const setPageChanges = jest.fn();

      useEditablePageContextMock.mockReturnValue({
        setPageChanges,
        deletePage: jest.fn(),
        isError: false,
        isLoading: true,
        pageChanges: {},
        updatedPagePreview: { name: 'mock-page-name' } as any
      });
      tree();
      fireEvent.click(screen.getByRole('button', { name: 'mock-page-name' }));
      fireEvent.change(screen.getByRole('textbox', { name: 'Page Name' }), { target: { value: 'new-name' } });
      jest.advanceTimersToNextTimer();
      fireEvent.click(document.body);
      expect(setPageChanges).not.toBeCalled();
      expect(screen.queryByRole('textbox', { name: 'Page Name' })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'mock-page-name' })).toBeVisible();

      jest.useRealTimers();
    });

    it('does not save changes but goes into the noneditable state if the field only contains whitespace', () => {
      const setPageChanges = jest.fn();

      useEditablePageContextMock.mockReturnValue({
        setPageChanges,
        deletePage: jest.fn(),
        isError: false,
        isLoading: true,
        pageChanges: {},
        updatedPagePreview: { name: 'mock-page-name' } as any
      });
      tree();
      fireEvent.click(screen.getByRole('button', { name: 'mock-page-name' }));
      fireEvent.change(screen.getByRole('textbox', { name: 'Page Name' }), { target: { value: '  ' } });
      fireEvent.submit(document.querySelector('form')!);
      expect(setPageChanges).not.toBeCalled();
      expect(screen.queryByRole('textbox', { name: 'Page Name' })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'mock-page-name' })).toBeVisible();
    });

    it('does not save changes but goes into the noneditable state if the field is empty', () => {
      const setPageChanges = jest.fn();

      useEditablePageContextMock.mockReturnValue({
        setPageChanges,
        deletePage: jest.fn(),
        isError: false,
        isLoading: true,
        pageChanges: {},
        updatedPagePreview: { name: 'mock-page-name' } as any
      });
      tree();
      fireEvent.click(screen.getByRole('button', { name: 'mock-page-name' }));
      fireEvent.change(screen.getByRole('textbox', { name: 'Page Name' }), { target: { value: '' } });
      fireEvent.submit(document.querySelector('form')!);
      expect(setPageChanges).not.toBeCalled();
      expect(screen.queryByRole('textbox', { name: 'Page Name' })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'mock-page-name' })).toBeVisible();
    });

    it('should not render bookmark icon by default', () => {
      tree();
      expect(screen.queryByTestId('bookmark-icon')).not.toBeInTheDocument();
    });

    it('should render bookmark icon if page id === revenue program default donation page', () => {
      useEditablePageContextMock.mockReturnValue({
        deletePage: jest.fn(),
        isError: false,
        isLoading: false,
        pageChanges: {},
        setPageChanges: jest.fn(),
        updatedPagePreview: { name: 'mock-page-name', id: 1, revenue_program: { default_donation_page: 1 } } as any
      });
      tree();
      expect(screen.getByTestId('bookmark-icon')).toBeInTheDocument();
    });

    it('is accessible', async () => {
      useEditablePageContextMock.mockReturnValue({
        deletePage: jest.fn(),
        isError: false,
        isLoading: false,
        pageChanges: {},
        setPageChanges: jest.fn(),
        updatedPagePreview: { name: 'mock-page-name', id: 1, revenue_program: { default_donation_page: 1 } } as any
      });
      const { container } = tree();

      fireEvent.click(screen.getByRole('button', { name: 'mock-page-name' }));

      // axe seems to trip over contrast detection on this component.
      // See https://github.com/nickcolley/jest-axe/issues/147

      expect(await axe(container, { rules: { 'color-contrast': { enabled: false } } })).toHaveNoViolations();
    });
  });
});
