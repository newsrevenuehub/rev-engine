import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import Hero, { HeroProps } from './Hero';

const heroTitle = 'Page title';
const heroSubtitle = 'This is the page subtitle';
const heroPlaceholder = 'placeholder value';
const onChange = jest.fn();

describe('Hero', () => {
  function tree(props?: Partial<HeroProps>) {
    return render(
      <Hero title={heroTitle} subtitle={heroSubtitle} placeholder={heroPlaceholder} onChange={onChange} {...props} />
    );
  }

  it('should render title, subtitle and searchbar', () => {
    tree();

    const title = screen.getByText(heroTitle);
    expect(title).toBeInTheDocument();

    const subtitle = screen.getByText(heroSubtitle);
    expect(subtitle).toBeInTheDocument();

    const searchText = screen.getByRole('textbox', { name: `Search for ${heroPlaceholder}` });
    expect(searchText).toBeInTheDocument();
  });

  it('should render export if exportData is received', () => {
    tree({ exportData: { email: 'mock-email', transactions: 1234 } });
    expect(screen.getByRole('button', { name: /Export/i })).toBeInTheDocument();
  });

  it('should render export even if exportData.transactions is 0', () => {
    tree({ exportData: { email: 'mock-email', transactions: 0 } });
    expect(screen.getByRole('button', { name: /Export/i })).toBeInTheDocument();
  });

  it('should be accessible', async () => {
    const { container } = render(
      <Hero title={heroTitle} subtitle={heroSubtitle} placeholder={heroPlaceholder} onChange={onChange} />
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
