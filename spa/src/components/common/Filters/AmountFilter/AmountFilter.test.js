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

  it('should call onChange using debounce when amount changes', async () => {
    tree();

    const min = screen.getByRole('spinbutton', { name: 'Filter minimum amount' });
    const max = screen.getByRole('spinbutton', { name: 'Filter maximum amount' });
    fireEvent.change(min, { target: { value: '100' } });
    fireEvent.change(max, { target: { value: '500' } });
    fireEvent.change(min, { target: { value: '200' } });

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith({ gte: '200', lte: '500' });
    });
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('should be accessible', async () => {
    const { container } = tree();
    expect(await axe(container)).toHaveNoViolations();
  });
});
