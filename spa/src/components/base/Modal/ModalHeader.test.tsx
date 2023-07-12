import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import { ModalHeader, ModalHeaderProps } from './ModalHeader';

describe('ModalHeader', () => {
  function tree(props?: Partial<ModalHeaderProps>) {
    return render(<ModalHeader {...props}>children</ModalHeader>);
  }

  it('sets the ID prop on its DOM element', () => {
    tree({ id: 'mock-id' });
    // eslint-disable-next-line testing-library/no-node-access
    expect(document.getElementById('mock-id')).toHaveTextContent('children');
  });

  it('displays its children', () => {
    tree();
    expect(screen.getByText('children')).toBeInTheDocument();
  });

  it('displays the icon prop if specified', () => {
    tree({ icon: <div data-testid="mock-icon" /> });
    expect(screen.getByTestId('mock-icon')).toBeInTheDocument();
  });

  it('displays a close button that calls onClose if the onClose prop is provided', () => {
    const onClose = jest.fn();

    tree({ onClose });
    expect(onClose).not.toBeCalled();
    userEvent.click(screen.getByRole('button'));
    expect(onClose).toBeCalledTimes(1);
  });

  it("doesn't display a close button if the onClose prop is omitted", () => {
    tree();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('uses the ARIA label specified for the close button', () => {
    tree({ closeAriaLabel: 'mock-close-label', onClose: jest.fn() });
    expect(screen.getByRole('button', { name: 'mock-close-label' })).toBeInTheDocument();
  });

  it("uses 'Close' as the label on the close button by default", () => {
    tree({ onClose: jest.fn() });
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
