import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import Hero, { HeroProps } from './Hero';

jest.mock('components/common/Button/ExportButton', () => () => {
  return <button>mock-export-button</button>;
});

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
    expect(screen.getByRole('button', { name: 'mock-export-button' })).toBeInTheDocument();
  });

  it('should render export even if exportData.transactions is 0', () => {
    tree({ exportData: { email: 'mock-email', transactions: 0 } });
    expect(screen.getByRole('button', { name: 'mock-export-button' })).toBeInTheDocument();
    expect(screen.getByTestId('right-action')).toBeInTheDocument();
  });

  it("shouldn't render export if exportData is not defined", () => {
    tree({ exportData: undefined });

    expect(screen.queryByRole('button', { name: 'mock-export-button' })).not.toBeInTheDocument();
  });

  it('should not render RightAction if neither exportData and onChange is defined', () => {
    tree({ exportData: undefined, onChange: undefined });
    expect(screen.queryByTestId('right-action')).not.toBeInTheDocument();
  });

  it('should be accessible with export button', async () => {
    const { container } = tree({ exportData: { email: 'mock-email', transactions: 0 } });
    expect(await axe(container)).toHaveNoViolations();
  });

  it('should be accessible without export button', async () => {
    const { container } = tree();
    expect(await axe(container)).toHaveNoViolations();
  });
});
