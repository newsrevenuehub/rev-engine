import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import ErrorMessage, { ErrorMessageProps } from './ErrorMessage';

function tree(props?: Partial<ErrorMessageProps>) {
  return render(<ErrorMessage children="test-child" {...props} />);
}

describe('ErrorMessage', () => {
  it('shows its children', () => {
    tree();
    expect(screen.getByText('test-child')).toBeVisible();
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
