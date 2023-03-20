import { axe } from 'jest-axe';
import { useAlert } from 'react-alert';
import { fireEvent, render, screen, waitFor } from 'test-utils';
import { useEditablePageContext } from 'hooks/useEditablePage';
import UnpublishButton from './UnpublishButton';
import formatDatetimeForAPI from 'utilities/formatDatetimeForAPI';
import { GENERIC_ERROR } from 'constants/textConstants';

jest.mock('react-alert', () => ({
  ...jest.requireActual('react-alert'),
  useAlert: jest.fn()
}));
jest.mock('hooks/useEditablePage');
jest.mock('./UnpublishModal/UnpublishModal');

const page = {
  published_date: formatDatetimeForAPI(new Date())
};

function tree() {
  return render(<UnpublishButton />);
}

describe('UnpublishButton', () => {
  const useAlertMock = useAlert as jest.Mock;
  const useEditablePageContextMock = useEditablePageContext as jest.Mock;

  beforeEach(() => {
    useEditablePageContextMock.mockReturnValue({ page, savePageChanges: jest.fn() });
  });

  it('shows nothing if page in context is undefined', () => {
    useEditablePageContextMock.mockReturnValue({ page: undefined, savePageChanges: jest.fn() });
    tree();
    expect(document.body).toHaveTextContent('');
  });

  it('shows nothing if savePageChanges in context is undefined', () => {
    useEditablePageContextMock.mockReturnValue({ page, savePageChanges: undefined });
    tree();
    expect(document.body).toHaveTextContent('');
  });

  describe('When both page and savePageChanges are set', () => {
    it('shows an Unpublish button', () => {
      tree();
      expect(screen.getByRole('button', { name: 'Unpublish' })).toBeVisible();
    });

    it('shows the unpublish modal when the button is clicked', () => {
      tree();
      expect(screen.queryByTestId('mock-unpublish-modal')).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Unpublish' }));
      expect(screen.getByTestId('mock-unpublish-modal')).toBeInTheDocument();
    });

    it('closes the unpublish modal if the user closes it', () => {
      tree();
      fireEvent.click(screen.getByRole('button', { name: 'Unpublish' }));
      expect(screen.getByTestId('mock-unpublish-modal')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'onClose' }));
      expect(screen.queryByTestId('mock-unpublish-modal')).not.toBeInTheDocument();
    });

    describe('When the user chooses to unpublish the page', () => {
      it("sets the page's published date to undefined", async () => {
        const savePageChanges = jest.fn();

        useEditablePageContextMock.mockReturnValue({ page, savePageChanges });
        tree();
        fireEvent.click(screen.getByRole('button', { name: 'Unpublish' }));
        expect(savePageChanges).not.toBeCalled();
        fireEvent.click(screen.getByRole('button', { name: 'onUnpublish' }));
        expect(savePageChanges.mock.calls).toEqual([[{ published_date: undefined }]]);

        // Let the pending action complete.
        await waitFor(() => expect(screen.queryByTestId('mock-unpublish-modal')).not.toBeInTheDocument());
      });

      it('shows an error message and closes the unpublish modal if saving changes fails', async () => {
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        const error = jest.fn();
        const savePageChanges = jest.fn().mockRejectedValue(new Error());

        useAlertMock.mockReturnValue({ error });
        useEditablePageContextMock.mockReturnValue({ page, savePageChanges });
        tree();
        fireEvent.click(screen.getByRole('button', { name: 'Unpublish' }));
        fireEvent.click(screen.getByRole('button', { name: 'onUnpublish' }));
        await waitFor(() => expect(error).toBeCalled());
        expect(error.mock.calls).toEqual([[GENERIC_ERROR]]);
        expect(screen.queryByTestId('mock-unpublish-modal')).not.toBeInTheDocument();
        errorSpy.mockRestore();
      });

      it('closes the unpublish modal when saving changes succeeds', async () => {
        tree();
        fireEvent.click(screen.getByRole('button', { name: 'Unpublish' }));
        expect(screen.getByTestId('mock-unpublish-modal')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'onUnpublish' }));
        await waitFor(() => expect(screen.queryByTestId('mock-unpublish-modal')).not.toBeInTheDocument());
      });

      // We don't need to test the alert on success; useEditablePage takes care
      // of that for us.
    });
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
