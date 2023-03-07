import { render, screen, fireEvent } from 'test-utils';

import CircleButton from './CircleButton';
import { faEdit } from '@fortawesome/free-solid-svg-icons';

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

    await new Promise((r) => setTimeout(r, 2000));
    const ttext = screen.queryByText('Test Tooltip Text');
    expect(ttext).toBeInTheDocument();
  });
});
