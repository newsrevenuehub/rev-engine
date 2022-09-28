import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import Button from './Button';

function tree(props) {
  return render(<Button {...props}>mock-button-label</Button>);
}

describe('Button', () => {
  it('displays a button', () => {
    tree();
    expect(screen.getByRole('button', { name: 'mock-button-label' })).toBeVisible();
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
