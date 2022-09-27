import { axe } from 'jest-axe';
import { render, screen, fireEvent, waitFor } from 'test-utils';

import AmountFilter from './AmountFilter';

const onChange = jest.fn();

describe('AmountFilter', () => {
  const tree = () => render(<AmountFilter onChange={onChange} />);

  it('should render AmountFilter', () => {
    tree();

    expect(screen.getByText(/amount/i)).toBeVisible();
    expect(screen.getByRole('spinbutton', { name: 'Filter minimum amount' })).toHaveValue(null);
    expect(screen.getByRole('spinbutton', { name: 'Filter maximum amount' })).toHaveValue(null);
  });

  it('should call onChange when amount changes', async () => {
    tree();

    const min = screen.getByRole('spinbutton', { name: 'Filter minimum amount' });
    fireEvent.change(min, { target: { value: '100' } });

    const max = screen.getByRole('spinbutton', { name: 'Filter maximum amount' });
    fireEvent.change(max, { target: { value: '500' } });
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith({ amount__gte: 10000, amount__lte: 50000 });
    });
  });

  it('should be accessible', async () => {
    const { container } = tree();
    expect(await axe(container)).toHaveNoViolations();
  });
});
