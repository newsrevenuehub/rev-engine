import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import EditTabHeader, { EditTabHeaderProps } from './EditTabHeader';

function tree(props?: Partial<EditTabHeaderProps>) {
  return render(<EditTabHeader prompt="mock-prompt" {...props} />);
}

describe('EditTabHeader', () => {
  it('displays the prompt', () => {
    tree({ prompt: 'test-prompt' });
    expect(screen.getByText('test-prompt')).toBeVisible();
  });

  it("doesn't display an add button if the onAdd prop is omitted", () => {
    tree({ addButtonLabel: 'test-label' });
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it("doesn't display an add button if the addButtonLabel prop is omitted", () => {
    tree({ onAdd: jest.fn() });
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  describe('When both addButtonLabel and onAdd props are provided', () => {
    it('displays a button with the addButtonLabel text', () => {
      tree({ addButtonLabel: 'test-label', onAdd: jest.fn() });
      expect(screen.getByRole('button', { name: 'test-label' })).toBeInTheDocument();
    });

    it('calls onAdd when the button is clicked', () => {
      const onAdd = jest.fn();

      tree({ onAdd, addButtonLabel: 'test-label' });
      expect(onAdd).not.toBeCalled();
      userEvent.click(screen.getByRole('button', { name: 'test-label' }));
      expect(onAdd).toBeCalledTimes(1);
    });

    it('is accessible', async () => {
      const { container } = tree({ addButtonLabel: 'test-label', onAdd: jest.fn() });

      expect(await axe(container)).toHaveNoViolations();
    });
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
