import { render, screen } from 'test-utils';
import { axe } from 'jest-axe';
import DElement, { DElementProps } from './DElement';

function tree(props?: Partial<DElementProps>) {
  return render(
    <ul>
      <DElement {...props} />
    </ul>
  );
}

describe('DElement', () => {
  it('displays a label if defined', () => {
    tree({ label: 'mock-label' });
    expect(screen.getByText('mock-label')).toBeVisible();
  });

  it('displays a description if defined', () => {
    tree({ description: 'mock-description' });
    expect(screen.getByText('mock-description')).toBeVisible();
  });

  it('displays children', () => {
    tree({ children: <div data-testid="mock-children" /> });
    expect(screen.getByTestId('mock-children')).toBeInTheDocument();
  });

  it('spreads props on the container <li> element', () => {
    tree({ 'data-testid': 'mock-spread-prop' });
    expect(screen.getByTestId('mock-spread-prop')).toBeInTheDocument();
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
