import { render, screen, waitFor } from 'test-utils';
import { useEditablePageContext } from 'hooks/useEditablePage';
import userEvent from '@testing-library/user-event';
import PageEditor from './PageEditor';

jest.mock('appSettings', () => ({
  ...jest.requireActual('appSettings'),
  CAPTURE_PAGE_SCREENSHOT: 'mock-capture-page-screenshot'
}));
jest.mock('hooks/useRequest');
jest.mock('elements/GlobalLoading');
jest.mock('hooks/useEditablePage');
jest.mock('components/donationPage/DonationPage');
jest.mock('components/pageEditor/editInterface/EditInterface', () => ({
  __esModule: true,
  default: () => <div data-testid="mock-edit-interface"></div>
}));
jest.mock('elements/modal/GlobalConfirmationModal');

describe('PageEditor', () => {
  const useEditablePageContextMock = jest.mocked(useEditablePageContext);

  function tree(props) {
    render(<PageEditor {...props} />);
  }

  beforeEach(() => {
    useEditablePageContextMock.mockReturnValue({
      deletePage: jest.fn(),
      error: null,
      isError: false,
      isLoading: false,
      page: undefined,
      savePageChanges: jest.fn(),
      pageChanges: {},
      setPageChanges: jest.fn(),
      updatedPagePreview: {}
    });
  });

  it('should render DonationPage if updatedPagePreview is defined', () => {
    tree();
    expect(screen.getByTestId('mock-donation-page')).toBeInTheDocument();
  });

  it('should not render DonationPage if updatedPagePreview is undefined', () => {
    useEditablePageContextMock.mockReturnValue({
      deletePage: jest.fn(),
      error: null,
      isError: false,
      isLoading: false,
      page: undefined,
      savePageChanges: jest.fn(),
      pageChanges: {},
      setPageChanges: jest.fn(),
      updatedPagePreview: undefined
    });

    tree();
    expect(screen.queryByTestId('mock-donation-page')).not.toBeInTheDocument();
  });

  describe('when the save button is clicked', () => {
    const savePageChangesMock = jest.fn();

    beforeEach(() => {
      useEditablePageContextMock.mockReturnValue({
        deletePage: jest.fn(),
        error: null,
        isError: false,
        isLoading: false,
        page: {},
        savePageChanges: savePageChangesMock,
        pageChanges: {
          header_bg_image: 'mock-header-bg-image'
        },
        setPageChanges: jest.fn(),
        updatedPagePreview: {
          name: 'mock-update-page-preview-name'
        }
      });
    });

    it('should call savePageChanges and pass in the correct props', async () => {
      tree();

      expect(savePageChangesMock).not.toBeCalled();
      userEvent.click(screen.getByRole('button', { name: 'Save' }));

      await waitFor(() => {
        expect(savePageChangesMock).toBeCalledTimes(1);
      });

      expect(savePageChangesMock).toBeCalledWith(
        {},
        'mock-update-page-preview-name',
        screen.getByTestId('mock-donation-page')
      );
    });
  });

  describe('when loading', () => {
    describe('useEditablePageContext', () => {
      it('should render GlobalLoading', () => {
        useEditablePageContextMock.mockReturnValue({
          deletePage: jest.fn(),
          error: null,
          isError: false,
          isLoading: true,
          page: {},
          savePageChanges: jest.fn(),
          pageChanges: {},
          setPageChanges: jest.fn(),
          updatedPagePreview: {}
        });

        tree();
        expect(screen.getByTestId('mock-global-loading')).toBeInTheDocument();
      });
      it('should render DonationPage', () => {
        useEditablePageContextMock.mockReturnValue({
          deletePage: jest.fn(),
          error: null,
          isError: false,
          isLoading: true,
          page: {},
          savePageChanges: jest.fn(),
          pageChanges: {},
          setPageChanges: jest.fn(),
          updatedPagePreview: {}
        });

        tree();
        expect(screen.getByTestId('mock-donation-page')).toBeInTheDocument();
      });
    });
  });
});
