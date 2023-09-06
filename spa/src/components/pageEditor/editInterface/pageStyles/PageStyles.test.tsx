import userEvent from '@testing-library/user-event';
import { useEditablePageBatch } from 'hooks/useEditablePageBatch';
import { axe } from 'jest-axe';
import { donationPageBase } from 'styles/themes';
import { render, screen } from 'test-utils';
import { EditSaveControlsProps } from '../EditSaveControls';
import { EditTabHeaderProps } from '../EditTabHeader';
import PageStyles from './PageStyles';

jest.mock('hooks/useEditablePageBatch');
jest.mock('./StylesTab', () => (props: any) => <div data-testid="mock-styles-tab">{JSON.stringify(props)}</div>);
jest.mock('../EditTabHeader', () => ({ prompt }: EditTabHeaderProps) => (
  <div data-testid="mock-edit-tab-header">{prompt}</div>
));
jest.mock('../EditSaveControls', () => ({ cancelDisabled, onCancel, onUpdate, variant }: EditSaveControlsProps) => (
  <div data-testid="mock-edit-controls" data-variant={variant}>
    <button disabled={cancelDisabled!} onClick={onCancel}>
      undo
    </button>
    <button onClick={onUpdate}>update</button>
  </div>
));

function tree() {
  return render(<PageStyles />);
}

const mockStyles = {
  id: 'mock-styles-id',
  name: 'mock-styles-name'
};

describe('PageStyles', () => {
  const useEditablePageBatchMock = jest.mocked(useEditablePageBatch);

  beforeEach(() => {
    useEditablePageBatchMock.mockReturnValue({
      addBatchChange: jest.fn(),
      batchHasChanges: false,
      batchPreview: { styles: mockStyles } as any,
      commitBatch: jest.fn(),
      resetBatch: jest.fn()
    });
  });

  it('should render nothing if batchPreview is not defined', () => {
    useEditablePageBatchMock.mockReturnValue({
      addBatchChange: jest.fn(),
      batchHasChanges: false,
      batchPreview: undefined,
      commitBatch: jest.fn(),
      resetBatch: jest.fn()
    });
    tree();
    expect(document.body.textContent).toBe('');
  });

  it('should render PageStyles components', () => {
    tree();
    expect(screen.getByTestId('mock-edit-tab-header')).toBeInTheDocument();
    expect(screen.getByTestId('mock-styles-tab')).toBeInTheDocument();
    expect(screen.getByTestId('mock-edit-controls')).toBeInTheDocument();
  });

  it('should render header prompt', () => {
    tree();
    expect(screen.getByTestId('mock-edit-tab-header')).toHaveTextContent(
      'Start branding your page. Choose header logo, colors, and more.'
    );
  });

  it('should render StylesTab with batchPreview.styles', () => {
    tree();
    expect(screen.getByTestId('mock-styles-tab')).toHaveTextContent(JSON.stringify(mockStyles));
  });

  it('should render donationPageBase as default styles, if batchPreview.styles is undefined', () => {
    useEditablePageBatchMock.mockReturnValue({
      addBatchChange: jest.fn(),
      batchHasChanges: false,
      batchPreview: { styles: undefined } as any,
      commitBatch: jest.fn(),
      resetBatch: jest.fn()
    });
    tree();
    expect(screen.getByTestId('mock-styles-tab')).toHaveTextContent(JSON.stringify(donationPageBase));
  });

  it('should render action buttons', () => {
    tree();
    expect(screen.getByTestId('mock-edit-controls')).toHaveAttribute('data-variant', 'undo');
    expect(screen.getByRole('button', { name: 'undo' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'update' })).toBeEnabled();
  });

  it('should disable undo button if batchHasChanges is "false"', () => {
    tree();
    expect(screen.getByRole('button', { name: 'undo' })).toBeDisabled();
  });

  it('should enable undo button if batchHasChanges is "true"', () => {
    useEditablePageBatchMock.mockReturnValue({
      addBatchChange: jest.fn(),
      batchHasChanges: true,
      batchPreview: { styles: mockStyles } as any,
      commitBatch: jest.fn(),
      resetBatch: jest.fn()
    });
    tree();
    expect(screen.getByRole('button', { name: 'undo' })).toBeEnabled();
  });

  it('should call resetBatch when undo button is clicked', () => {
    useEditablePageBatchMock.mockReturnValue({
      addBatchChange: jest.fn(),
      batchHasChanges: true,
      batchPreview: { styles: mockStyles } as any,
      commitBatch: jest.fn(),
      resetBatch: jest.fn()
    });
    tree();
    expect(useEditablePageBatchMock().resetBatch).not.toHaveBeenCalled();
    userEvent.click(screen.getByRole('button', { name: 'undo' }));
    expect(useEditablePageBatchMock().resetBatch).toHaveBeenCalled();
  });

  it('should call commitBatch when update button is clicked', () => {
    tree();
    expect(useEditablePageBatchMock().commitBatch).not.toHaveBeenCalled();
    userEvent.click(screen.getByRole('button', { name: 'update' }));
    expect(useEditablePageBatchMock().commitBatch).toHaveBeenCalled();
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
