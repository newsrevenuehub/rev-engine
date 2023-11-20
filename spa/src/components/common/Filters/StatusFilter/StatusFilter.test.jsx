import { render, screen, fireEvent } from 'test-utils';
import { PAYMENT_STATUS, PAYMENT_STATUS_EXCLUDE_IN_CONTRIBUTIONS } from 'constants/paymentStatus';

import StatusFilter, { STATUS_FILTERS } from './StatusFilter';
import { axe } from 'jest-axe';

const onClick = jest.fn();

describe('StatusFilter', () => {
  const tree = (props) => render(<StatusFilter onClick={onClick} {...props} />);

  it('should render default status filter', () => {
    tree();

    expect(screen.getByText(/status/i)).toBeVisible();
    for (const status of STATUS_FILTERS) {
      expect(screen.getByRole('button', { name: `filter by status: ${status}` })).toBeEnabled();
    }
  });

  it('should call onClick with clicked status', () => {
    tree();
    const paid = screen.getByRole('button', { name: `filter by status: ${PAYMENT_STATUS.PAID}` });
    fireEvent.click(paid);
    expect(onClick).toHaveBeenCalledWith(PAYMENT_STATUS.PAID);
  });

  it('should filter out options', () => {
    tree({ excludeStatusFilters: PAYMENT_STATUS_EXCLUDE_IN_CONTRIBUTIONS });

    for (const status of PAYMENT_STATUS_EXCLUDE_IN_CONTRIBUTIONS) {
      expect(screen.queryByRole('button', { name: `filter by status: ${status}` })).not.toBeInTheDocument();
    }

    expect(screen.getAllByRole('button')).toHaveLength(4);
  });

  it('should be accessible', async () => {
    const { container } = tree();
    expect(await axe(container)).toHaveNoViolations();
  });
});
