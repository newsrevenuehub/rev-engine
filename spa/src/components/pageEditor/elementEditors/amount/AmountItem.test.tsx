import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import AmountItem, { AmountItemProps } from './AmountItem';

function tree(props?: Partial<AmountItemProps>) {
  return render(<AmountItem amount={123} onRemove={jest.fn()} onSetDefault={jest.fn()} removable {...props} />);
}

describe('AmountItem', () => {
  it('displays the amount', () => {
    tree({ amount: 456.78 });
    expect(screen.getByText('456.78')).toBeVisible();
  });

  it('calls the onSetDefault prop when the amount is clicked', () => {
    const onSetDefault = jest.fn();

    tree({ amount: 100.25, onSetDefault });
    expect(onSetDefault).not.toBeCalled();
    userEvent.click(screen.getByRole('button', { name: 'Make 100.25 default' }));
    expect(onSetDefault).toBeCalledTimes(1);
  });

  describe('The remove button', () => {
    it('calls the onRemove prop when clicked', () => {
      const onRemove = jest.fn();

      tree({ amount: 1, onRemove });
      expect(onRemove).not.toBeCalled();
      userEvent.click(screen.getByRole('button', { name: 'Remove 1' }));
      expect(onRemove).toBeCalledTimes(1);
    });

    it('is enabled when the removable prop is falsy', () => {
      tree({ removable: false });
      expect(screen.getByRole('button', { name: 'Remove 123' })).toBeDisabled();
    });

    it('is enabled when the removable prop is true', () => {
      tree({ removable: true });
      expect(screen.getByRole('button', { name: 'Remove 123' })).toBeEnabled();
    });
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
