import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import { Switch, SwitchProps } from './Switch';

function tree(props?: Partial<SwitchProps>) {
  return render(<Switch {...props} inputProps={{ 'aria-label': 'mock-switch-label' }} />);
}

describe('Switch', () => {
  it('displays a switch', () => {
    tree();
    expect(screen.getByRole('checkbox', { name: 'mock-switch-label' })).toBeInTheDocument();
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
