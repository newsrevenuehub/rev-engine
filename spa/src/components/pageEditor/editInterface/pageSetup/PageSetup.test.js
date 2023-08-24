import { fireEvent, render, screen } from 'test-utils';
import PageSetup from './PageSetup';
import { useEditablePageBatch } from 'hooks/useEditablePageBatch';
import { axe } from 'jest-axe';
import { PageEditorContext } from 'components/pageEditor/PageEditor';
import userEvent from '@testing-library/user-event';

jest.mock('components/base/ImageUpload/ImageUpload');
jest.mock('hooks/useEditablePageBatch');

const page = {
  // URL fields need to be actual URLs to pass validation and enable the Update
  // button.
  header_link: 'https://mock-header-link.org',
  header_logo_thumbnail: 'mock-header-logo-thumbnail',
  heading: 'mock-heading',
  plan: { custom_thank_you_page_enabled: true, label: 'free' },
  post_thank_you_redirect: 'https://mock-post-thank-you-redirect.org',
  label: 'Free',
  thank_you_redirect: 'https://mock-thank-you-redirect.org'
};

function tree() {
  return render(
    <PageEditorContext.Provider value={{ errors: {} }}>
      <PageSetup />
    </PageEditorContext.Provider>
  );
}

describe('PageSetup', () => {
  const useEditablePageBatchMock = useEditablePageBatch; // as jest.Mock;

  function mockBatch(props) {
    useEditablePageBatchMock.mockReturnValue({
      addBatchChange: jest.fn(),
      batchHasChanges: true,
      batchPreview: page,
      commitBatch: jest.fn(),
      resetBatch: jest.fn(),
      ...props
    });
  }

  beforeEach(() => mockBatch({}));

  it('displays nothing if the batch preview is undefined', () => {
    mockBatch({ batchPreview: undefined });
    tree();
    expect(document.body.textContent).toBe('');
  });

  it('displays header text', () => {
    tree();
    expect(screen.getByText('Configure page settings here. These settings are page specific.')).toBeVisible();
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
    ['Form panel heading', 'heading'],
    ['Thank You page link', 'thank_you_redirect'],
    ['Post Thank You redirect', 'post_thank_you_redirect']
  ])('%s', (label, fieldName) => {
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
  });

  it('commits the edit batch when the Update button is clicked', () => {
    const commitBatch = jest.fn();

    mockBatch({ commitBatch });
    tree();
    expect(commitBatch).not.toBeCalled();
    expect(screen.getByRole('button', { name: 'Update' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Update' }));
    expect(commitBatch).toBeCalledTimes(1);
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
    tree({ batchPreview: { ...page, plan: { custom_thank_you_page_enabled: true, label: 'free' } } });
    expect(screen.getByLabelText('Thank You page link')).toBeInTheDocument();
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
