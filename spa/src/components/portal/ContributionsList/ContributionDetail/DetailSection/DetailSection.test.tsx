import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import DetailSection, { DetailSectionProps } from './DetailSection';

function tree(props?: Partial<DetailSectionProps>) {
  return render(<DetailSection title="test-title" {...props} />);
}

describe('DetailSection', () => {
  it('shows the title', () => {
    tree({ title: 'test-title' });
    expect(screen.getByRole('heading', { name: 'test-title' })).toBeVisible();
  });

  it('shows controls', () => {
    tree({ controls: <div data-testid="controls" /> });

    // There are two instances: one for desktop and one for mobile.
    expect(screen.getAllByTestId('controls').length).toBe(2);
  });

  it('shows children', () => {
    tree({ children: <div data-testid="children" /> });
    expect(screen.getByTestId('children')).toBeInTheDocument();
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
