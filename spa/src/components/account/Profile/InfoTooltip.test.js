import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { render, screen, waitFor } from 'test-utils';
import InfoTooltip from './InfoTooltip';

function tree(props) {
  return render(<InfoTooltip title="mock-tooltip-text" {...props} />);
}

describe('InfoTooltip', () => {
  it('displays a button labeled Help', () => {
    tree();
    expect(screen.getByRole('button', { name: 'Help' })).toBeVisible();
  });

  it('displays the tooltip when the button is clicked', async () => {
    tree({ title: 'test tooltip' });
    userEvent.click(screen.getByRole('button', { name: 'Help' }));
    await waitFor(() => expect(screen.getByText('test tooltip')).toBeVisible());
  });

  it('keeps the tooltip open if the button is clicked repeatedly', async () => {
    tree();
    userEvent.click(screen.getByRole('button', { name: 'Help' }));
    await waitFor(() => expect(screen.getByText('mock-tooltip-text')).toBeVisible());
    userEvent.click(screen.getByRole('button', { name: 'Help' }));
    expect(screen.getByText('mock-tooltip-text')).toBeVisible();
  });

  it('hides the tooltip if the user clicks elsewhere', async () => {
    tree();
    userEvent.click(screen.getByRole('button', { name: 'Help' }));
    await waitFor(() => expect(screen.getByText('mock-tooltip-text')).toBeVisible());
    userEvent.click(document.body);
    await waitFor(() => expect(screen.queryByText('mock-tooltip-text')).not.toBeInTheDocument());
  });

  describe('accessibility', () => {
    it('is accessible when the tooltip is not open', async () => {
      const { container } = tree();

      expect(await axe(container)).toHaveNoViolations();
    });

    it('is accessible when the tooltip is open', async () => {
      const { container } = tree();

      userEvent.click(screen.getByRole('button', { name: 'Help' }));
      expect(await axe(container)).toHaveNoViolations();
    });
  });
});
