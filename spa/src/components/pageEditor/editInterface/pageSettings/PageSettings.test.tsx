import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { PageEditorContext } from 'components/pageEditor/PageEditor';
import { useEditablePageContext } from 'hooks/useEditablePage';
import { UseEditablePageBatchResult, useEditablePageBatch } from 'hooks/useEditablePageBatch';
import useUser from 'hooks/useUser';
import { fireEvent, render, screen } from 'test-utils';
import PageSettings from './PageSettings';
import { PAGE_EDITOR_LOCALE_ACCESS_FLAG_NAME } from 'constants/featureFlagConstants';

jest.mock('components/base/ImageUpload/ImageUpload');
jest.mock('hooks/useEditablePage');
jest.mock('hooks/useEditablePageBatch');
jest.mock('hooks/useUser');

const page = {
  // URL fields need to be actual URLs to pass validation and enable the Update
  // button.
  header_link: 'https://mock-header-link.org',
  header_logo_thumbnail: 'mock-header-logo-thumbnail',
  heading: 'mock-heading',
  locale: 'en',
  plan: { custom_thank_you_page_enabled: true, label: 'free' },
  post_thank_you_redirect: 'https://mock-post-thank-you-redirect.org',
  label: 'Free',
  thank_you_redirect: 'https://mock-thank-you-redirect.org'
} as any;

function tree(errors: any = {}) {
  return render(
    <PageEditorContext.Provider value={{ errors }}>
      <PageSettings />
    </PageEditorContext.Provider>
  );
}

describe('PageSettings', () => {
  const useEditablePageBatchMock = jest.mocked(useEditablePageBatch);
  const useEditablePageContextMock = jest.mocked(useEditablePageContext);
  const useUserMock = jest.mocked(useUser);

  function mockBatch(props: Partial<UseEditablePageBatchResult>) {
    useEditablePageBatchMock.mockReturnValue({
      addBatchChange: jest.fn(),
      batchHasChanges: true,
      batchPreview: page,
      commitBatch: jest.fn(),
      resetBatch: jest.fn(),
      ...props
    });
  }

  beforeEach(() => {
    mockBatch({});
    useEditablePageContextMock.mockReturnValue({ isError: false, isLoading: false, page } as any);
    useUserMock.mockReturnValue({ isError: false, isLoading: false, refetch: jest.fn(), user: { flags: [] } as any });
  });

  it('displays nothing if the batch preview is undefined', () => {
    mockBatch({ batchPreview: undefined });
    tree();
    expect(document.body.textContent).toBe('');
  });

  it('displays header text', () => {
    tree();
    expect(screen.getByText('Create and change page settings.')).toBeVisible();
  });

  describe.each([
    ['Main header background', 'header_bg_image'],
    ['Graphic', 'graphic']
  ])('%s', (label, fieldName) => {
    it('displays the image and thumbnail URL as set in the batch preview', () => {
      mockBatch({
        batchPreview: {
          ...page,
          [fieldName]: `test-${fieldName}`,
          [`${fieldName}_thumbnail`]: `test-${fieldName}-image-thumbnail`
        }
      });
      tree();

      const input = screen.getByRole('button', { name: label });

      expect(input).toBeVisible();
      expect(input.dataset.value).toBe(`test-${fieldName}`);
      expect(input.dataset.thumbnailUrl).toBe(`test-${fieldName}-image-thumbnail`);
    });

    it('updates the edit batch when the user makes a change', () => {
      const addBatchChange = jest.fn();

      mockBatch({ addBatchChange });
      tree();
      expect(addBatchChange).not.toBeCalled();
      userEvent.click(screen.getByText(label));
      expect(addBatchChange.mock.calls).toEqual([
        [
          {
            [fieldName]: expect.any(File),
            [`${fieldName}_thumbnail`]: 'mock-thumbnail-url'
          }
        ]
      ]);
    });
  });

  describe.each([
    ['Form panel heading', 'heading', false],
    ['Thank You page link', 'thank_you_redirect', true],
    ['Post Thank You redirect', 'post_thank_you_redirect', false]
  ])('%s', (label, fieldName, isUrl) => {
    it('displays the field value as set in the batch preview', () => {
      mockBatch({
        batchPreview: {
          ...page,
          [fieldName]: `test-${fieldName}`
        }
      });
      tree();

      const input = screen.getByLabelText(label);

      expect(input).toBeVisible();
      expect(input).toHaveValue(`test-${fieldName}`);
    });

    it('updates the edit batch when the user makes a change', () => {
      const addBatchChange = jest.fn();

      mockBatch({ addBatchChange });
      tree();
      expect(addBatchChange).not.toBeCalled();

      // This is a change event, not userEvent.type(), because we aren't using the real
      // useEditablePageBatch which would cause data to update.

      fireEvent.change(screen.getByLabelText(label), { target: { value: `test-${fieldName}` } });
      expect(addBatchChange.mock.calls).toEqual([[{ [fieldName]: `test-${fieldName}` }]]);
    });

    it('shows the appropriate error if it exists in context', () => {
      tree({ [fieldName]: `test-error-message-${fieldName}` });
      expect(screen.getByText(`test-error-message-${fieldName}`)).toBeVisible();
    });

    if (isUrl) {
      it('shows an error message if an invalid URL is entered into it', () => {
        mockBatch({
          batchPreview: {
            ...page,
            [fieldName]: 'not a URL'
          }
        });
        tree();
        expect(screen.getByText('Please enter a valid URL.')).toBeVisible();
      });

      it('shows the error message in context even if the URL is invalid', () => {
        mockBatch({
          batchPreview: {
            ...page,
            [fieldName]: 'not a URL'
          }
        });
        tree({ [fieldName]: `test-error-message-${fieldName}` });
        expect(screen.queryByText('Please enter a valid URL.')).not.toBeInTheDocument();
        expect(screen.getByText(`test-error-message-${fieldName}`)).toBeVisible();
      });
    }
  });

  describe("When the user doesn't have the locale editing feature flag", () => {
    beforeEach(() => {
      useUserMock.mockReturnValue({ isError: false, isLoading: false, refetch: jest.fn(), user: { flags: [] } as any });
    });

    it("doesn't show the Page Language field", () => {
      tree();
      expect(screen.queryByRole('button', { name: /Page Language/ })).not.toBeInTheDocument();
    });

    it('commits the edit batch immediately when the Update button is clicked', () => {
      const commitBatch = jest.fn();

      mockBatch({ commitBatch });
      tree();
      expect(commitBatch).not.toBeCalled();
      expect(screen.getByRole('button', { name: 'Update' })).toBeEnabled();
      fireEvent.click(screen.getByRole('button', { name: 'Update' }));

      expect(commitBatch).toBeCalledTimes(1);
    });
  });

  describe('When the user does have the locale editing feature flag', () => {
    beforeEach(() => {
      useUserMock.mockReturnValue({
        isError: false,
        isLoading: false,
        refetch: jest.fn(),
        user: { flags: [{ name: PAGE_EDITOR_LOCALE_ACCESS_FLAG_NAME }] } as any
      });
    });

    it('shows the Page Language select with English and Spanish options', () => {
      tree();

      const menu = screen.getByRole('button', { name: /Page Language/ });

      expect(menu).toBeVisible();
      userEvent.click(menu);
      expect(screen.getAllByRole('option')).toHaveLength(2);
      expect(screen.getByRole('option', { name: 'English' })).toBeVisible();
      expect(screen.getByRole('option', { name: 'Spanish' })).toBeVisible();
    });

    it.each([
      ['en', 'English'],
      ['es', 'Spanish']
    ])('selects the correct option when the page locale is %s', (locale, label) => {
      mockBatch({
        batchPreview: {
          ...page,
          locale
        }
      });
      tree();
      expect(screen.getByRole('button', { name: `Page Language ${label}` })).toBeVisible();
    });

    it('updates the edit batch when the Page Language select is changed', () => {
      const addBatchChange = jest.fn();

      mockBatch({ addBatchChange });
      tree();
      userEvent.click(screen.getByRole('button', { name: /Page Language/ }));
      expect(addBatchChange).not.toBeCalled();
      userEvent.click(screen.getByRole('option', { name: 'Spanish' }));
      expect(addBatchChange.mock.calls).toEqual([[{ locale: 'es' }]]);
    });

    describe('When the page is published and locale has changed', () => {
      describe('And locale has changed', () => {
        let commitBatch: jest.Mock;

        beforeEach(() => {
          commitBatch = jest.fn();
          mockBatch({
            commitBatch,
            batchPreview: {
              ...page,
              locale: 'en',
              published_date: new Date()
            }
          });
          useEditablePageContextMock.mockReturnValue({
            isError: false,
            isLoading: false,
            page: { ...page, locale: 'es' }
          } as any);
        });

        it('shows a warning modal when the Update button is clicked', () => {
          tree();
          expect(screen.queryByText('Live Page Language')).not.toBeInTheDocument();
          userEvent.click(screen.getByRole('button', { name: 'Update' }));
          expect(screen.getByText('Live Page Language')).toBeVisible();
        });

        it("closes the modal and doesn't commit changes if the user cancels out of the warning modal", () => {
          tree();
          userEvent.click(screen.getByRole('button', { name: 'Update' }));
          expect(screen.getByText('Live Page Language')).toBeVisible();
          userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
          expect(screen.queryByText('Live Page Language')).not.toBeInTheDocument();
          expect(commitBatch).not.toBeCalled();
        });

        it('closes the modal and commits changes if the user confirms in the warning modal', () => {
          tree();
          userEvent.click(screen.getByRole('button', { name: 'Update' }));
          expect(screen.getByText('Live Page Language')).toBeVisible();
          userEvent.click(screen.getByRole('button', { name: 'Change' }));
          expect(screen.queryByText('Live Page Language')).not.toBeInTheDocument();
          expect(commitBatch).toBeCalledTimes(1);
        });
      });

      describe('But locale has not changed', () => {
        it('commits the edit batch immediately when the Update button is clicked', () => {
          const commitBatch = jest.fn();

          mockBatch({ commitBatch });
          tree();
          expect(commitBatch).not.toBeCalled();
          expect(screen.getByRole('button', { name: 'Update' })).toBeEnabled();
          fireEvent.click(screen.getByRole('button', { name: 'Update' }));
          expect(commitBatch).toBeCalledTimes(1);
        });
      });
    });

    describe("When the page isn't published", () => {
      it("commits the edit batch immediately when the Update button is clicked but locale hasn't changed", () => {
        const commitBatch = jest.fn();

        mockBatch({ commitBatch });
        tree();
        expect(commitBatch).not.toBeCalled();
        expect(screen.getByRole('button', { name: 'Update' })).toBeEnabled();
        fireEvent.click(screen.getByRole('button', { name: 'Update' }));
        expect(commitBatch).toBeCalledTimes(1);
      });
    });
  });

  it('resets the edit batch when the Undo button is clicked', () => {
    const resetBatch = jest.fn();

    mockBatch({ resetBatch });
    tree();
    expect(resetBatch).not.toBeCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(resetBatch).toBeCalledTimes(1);
  });

  it('enables the Undo button if there are changes to commit', () => {
    mockBatch({ batchHasChanges: true });
    tree();
    expect(screen.getByRole('button', { name: 'Undo' })).toBeEnabled();
  });

  it('disables the Undo button if there are no changes to commit', () => {
    mockBatch({ batchHasChanges: false });
    tree();
    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled();
  });

  it('hides the thank you page URL field if disabled by plan', () => {
    mockBatch({ batchPreview: { ...page, plan: { custom_thank_you_page_enabled: false, label: 'free' } } });
    tree();
    expect(screen.queryByLabelText('Thank You page link')).not.toBeInTheDocument();
  });

  it('shows the thank you page URL field if enabled by plan', () => {
    mockBatch({ batchPreview: { ...page, plan: { custom_thank_you_page_enabled: true, label: 'free' } } });
    tree();
    expect(screen.getByLabelText('Thank You page link')).toBeInTheDocument();
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
