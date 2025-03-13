import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import Hero, { HeroProps } from './Hero';

const heroTitle = 'Page title';
const heroSubtitle = 'This is the page subtitle';

describe('Hero', () => {
  function tree(props?: Partial<HeroProps>) {
    return render(<Hero title={heroTitle} subtitle={heroSubtitle} {...props} />);
  }

  it('should show the title and subtitle', () => {
    tree();
    expect(screen.getByRole('heading', { name: heroTitle })).toBeVisible();
    expect(screen.getByText(heroSubtitle)).toBeVisible();
  });

  it('should show corner content if specified', () => {
    tree({ cornerContent: <div data-testid="test-corner-content" /> });
    expect(screen.getByTestId('test-corner-content')).toBeInTheDocument();
  });

  it('should be accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
