import { faEdit } from '@fortawesome/free-solid-svg-icons';
import { render, screen, fireEvent, waitFor } from 'test-utils';
import CircleButton from './CircleButton';

describe('Tooltips on CircleButton', () => {
  test('tooltip should show up on focus', async () => {
    render(
      <div>
        <CircleButton
          icon={faEdit}
          buttonType="neutral"
          data-testid="edit-page-button"
          tooltipText="Test Tooltip Text"
        />
      </div>
    );

    const editButton = screen.queryByTestId('edit-page-button');

    fireEvent.focusIn(editButton);
    await waitFor(() => expect(screen.getByText('Test Tooltip Text')).toBeVisible());

    const ttext = screen.queryByText('Test Tooltip Text');
    expect(ttext).toBeInTheDocument();
  });
});
