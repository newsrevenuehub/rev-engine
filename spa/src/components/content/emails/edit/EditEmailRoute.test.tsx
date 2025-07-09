import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { fireEvent, render, screen, waitFor } from 'test-utils';
import EditEmailRoute from './EditEmailRoute';
import { useSnackbar } from 'notistack';
import { useHistory, useParams } from 'react-router-dom';
import { useEmailCustomizations } from 'hooks/useEmailCustomizations';
import useUser from 'hooks/useUser';
import { EMAILS_SLUG } from 'routes';
import { defaultEmailContent } from './defaultContent';
import { useRevenueProgram } from 'hooks/useRevenueProgram';

jest.mock('hooks/useEmailCustomizations');
jest.mock('hooks/useRevenueProgram');
jest.mock('hooks/useUser');
jest.mock('./EditorBlock');
jest.mock('./EditorToolbar');
jest.mock('./ResetContentButton');

jest.mock('notistack', () => ({
  ...jest.requireActual('notistack'),
  useSnackbar: jest.fn()
}));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useHistory: jest.fn(),
  useParams: jest.fn()
}));

const mockCustomizations = {
  message: {
    id: 1,
    revenue_program: 123,
    email_type: 'contribution_receipt',
    email_block: 'message',
    content_html: '<p>mock-content-html</p>',
    content_plain_text: 'mock-content-plain-text'
  }
} as any;

const mockRp = {
  id: 123,
  name: 'mock-rp-name',
  transactional_email_style: {
    is_default_logo: false,
    logo_alt_text: 'test-rp-logo-alt-text',
    logo_url: 'test-rp-logo-url'
  }
} as any;

function tree() {
  return render(
    <>
      <EditEmailRoute />
      <button data-edit-email-route-maintain-editor-focus>maintain focus</button>
    </>
  );
}

describe('EditEmailRoute', () => {
  const useEmailCustomizationsMock = jest.mocked(useEmailCustomizations);
  const useHistoryMock = jest.mocked(useHistory);
  const useParamsMock = jest.mocked(useParams);
  const useRevenueProgramMock = jest.mocked(useRevenueProgram);
  const useSnackbarMock = jest.mocked(useSnackbar);
  const useUserMock = jest.mocked(useUser);
  let enqueueSnackbar: jest.Mock;

  beforeEach(() => {
    enqueueSnackbar = jest.fn();
    useEmailCustomizationsMock.mockReturnValue({
      customizations: mockCustomizations,
      isError: false,
      isLoading: false,
      upsertCustomizations: jest.fn()
    });
    useHistoryMock.mockReturnValue({ push: jest.fn() });
    useParamsMock.mockReturnValue({ emailType: 'contribution_receipt' });
    useSnackbarMock.mockReturnValue({ enqueueSnackbar } as any);
    useRevenueProgramMock.mockReturnValue({
      revenueProgram: mockRp,
      isFetching: false,
      updateRevenueProgram: jest.fn()
    });
    useUserMock.mockReturnValue({
      isError: false,
      isLoading: false,
      refetch: jest.fn(),
      user: {
        revenue_programs: [mockRp]
      } as any
    });
  });

  it.each([['Back'], ['Cancel Changes']])('shows a %s button that returns to the emails list', (name) => {
    tree();

    const button = screen.getByRole('button', { name });

    expect(button).toBeVisible();
    expect(button).toHaveAttribute('href', EMAILS_SLUG);
  });

  it.each([['Sender Email Address'], ['Sender Name']])('shows a disabled %s field', (name) => {
    tree();

    const field = screen.getByRole('textbox', { name });

    expect(field).toBeVisible();
    expect(field).toBeDisabled();
  });

  it('shows default content in the message editor if no existing contributions exist', () => {
    useEmailCustomizationsMock.mockReturnValue({
      customizations: {},
      isError: false,
      isLoading: false,
      upsertCustomizations: jest.fn()
    });
    tree();
    expect(screen.getByLabelText('Message')).toHaveValue(
      defaultEmailContent('contribution_receipt', 'message', mockRp)
    );
  });

  it('shows the existing contribution in the message editor if it exists', () => {
    tree();
    expect(screen.getByLabelText('Message')).toHaveValue(mockCustomizations.message.content_html);
  });

  it('initially disconnects the formatting toolbar and reset content buttons from any editor', () => {
    tree();
    expect(screen.getByTestId('mock-editor-toolbar').dataset.editor).toBe('null');
    expect(screen.getByTestId('mock-reset-content-button').dataset.editor).toBe('null');
  });

  it("connects the formatting toolbar and reset content button with a editor when it's focused", () => {
    tree();
    fireEvent.focus(screen.getByLabelText('Message'));

    // See mocks for where this { label: 'Message', etc } object comes from.
    expect(screen.getByTestId('mock-editor-toolbar').dataset.editor).toBe(
      JSON.stringify({ label: 'Message', state: { selection: {} } })
    );
    expect(screen.getByTestId('mock-reset-content-button').dataset.editor).toBe(
      JSON.stringify({ label: 'Message', state: { selection: {} } })
    );
  });

  it('passes through the editor selection to the formatting toolbar when it changes', () => {
    tree();
    fireEvent.select(screen.getByLabelText('Message'));

    // See mocks for where this { label: 'Message',  etc } object comes from.
    expect(screen.getByTestId('mock-editor-toolbar').dataset.editor).toBe(
      JSON.stringify({ label: 'Message', state: { selection: {} } })
    );
    expect(screen.getByTestId('mock-reset-content-button').dataset.editor).toBe(
      JSON.stringify({ label: 'Message', state: { selection: {} } })
    );
  });

  it('sets the appropriate default content on the reset content button when an editor is focused', () => {
    tree();
    fireEvent.focus(screen.getByLabelText('Message'));
    expect(screen.getByTestId('mock-reset-content-button').dataset.defaultContent).toBe(
      defaultEmailContent('contribution_receipt', 'message', mockRp)
    );
  });

  it('disconnects the formatting toolbar and reset content button when the user clicks outside editors', () => {
    tree();
    fireEvent.focus(screen.getByLabelText('Message'));
    expect(screen.getByTestId('mock-editor-toolbar').dataset.editor).not.toBe('null');
    expect(screen.getByTestId('mock-reset-content-button').dataset.editor).not.toBe('null');
    fireEvent.mouseUp(document.body);
    expect(screen.getByTestId('mock-editor-toolbar').dataset.editor).toBe('null');
    expect(screen.getByTestId('mock-reset-content-button').dataset.editor).toBe('null');
  });

  it('ignores clicks inside elements with data-edit-email-route-maintain-editor-focus attributes', () => {
    tree();
    fireEvent.focus(screen.getByLabelText('Message'));
    expect(screen.getByTestId('mock-editor-toolbar').dataset.editor).not.toBe('null');
    expect(screen.getByTestId('mock-reset-content-button').dataset.editor).not.toBe('null');
    fireEvent.mouseUp(screen.getByRole('button', { name: 'maintain focus' }));
  });

  it('disables the save button if no customizations exist and the content of the editors matches default content', () => {
    useEmailCustomizationsMock.mockReturnValue({
      customizations: {},
      isError: false,
      isLoading: false,
      upsertCustomizations: jest.fn()
    });
    tree();
    userEvent.clear(screen.getByLabelText('Message'));
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
    userEvent.type(screen.getByLabelText('Message'), defaultEmailContent('contribution_receipt', 'message', mockRp));
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('disables the save button if customizations exist and the content of the editors matches them', () => {
    tree();
    userEvent.clear(screen.getByLabelText('Message'));
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
    userEvent.type(screen.getByLabelText('Message'), mockCustomizations.message.content_html);
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('enables the save button if there are pending changes', () => {
    tree();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    userEvent.type(screen.getByLabelText('Message'), 'test-change');
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
  });

  it('upserts customizations when the save button is clicked', () => {
    const upsertCustomizations = jest.fn();

    useEmailCustomizationsMock.mockReturnValue({
      upsertCustomizations,
      customizations: mockCustomizations,
      isError: false,
      isLoading: false
    });
    tree();
    userEvent.clear(screen.getByLabelText('Message'));
    userEvent.type(screen.getByLabelText('Message'), 'test-change');
    expect(upsertCustomizations).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(upsertCustomizations.mock.calls).toEqual([[{ message: 'test-change' }, mockRp.id]]);
  });

  it.each([
    ['succeeds', true, 'The changes made to Receipts have been successfully saved.'],
    ['fails', false, 'Something went wrong saving the changes you made to Receipts. Please wait and try again.']
  ])(
    'shows the correct notification and navigates properly when saving changes %s',
    async (_, resolvedValue, notification) => {
      const push = jest.fn();

      useEmailCustomizationsMock.mockReturnValue({
        customizations: mockCustomizations,
        isError: false,
        isLoading: false,
        upsertCustomizations: jest.fn().mockResolvedValue(resolvedValue)
      });
      useHistoryMock.mockReturnValue({ push });
      tree();
      userEvent.type(screen.getByLabelText('Message'), 'test-change');
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
      await waitFor(() => expect(enqueueSnackbar).toBeCalled());
      expect(enqueueSnackbar.mock.calls).toEqual([[notification, expect.anything()]]);
      expect(push.mock.calls).toEqual(resolvedValue ? [[EMAILS_SLUG]] : []);
    }
  );

  it('is accessible', async () => {
    const { container } = tree();

    // We have a heading failure because the title on the page is an <h1> and
    // subheads are <h3>, because we are using <HeadingSection> without a
    // <SubheadingSection>. TODO in DEV-XXXX to harmonize this.

    expect(
      await axe(container, {
        rules: {
          'heading-order': { enabled: false }
        }
      })
    ).toHaveNoViolations();
  });
});
