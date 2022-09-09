import { render, screen } from 'test-utils';
import Hero from './Hero';

const heroTitle = 'Page title';
const heroSubtitle = 'This is the page subtitle';
const heroPlaceholder = 'placeholder value';
const onChange = jest.fn();

describe('Hero', () => {
  it('should render title, subtitle and searchbar', () => {
    render(<Hero title={heroTitle} subtitle={heroSubtitle} placeholder={heroPlaceholder} onChange={onChange} />);

    const title = screen.getByText(heroTitle);
    expect(title).toBeInTheDocument();

    const subtitle = screen.getByText(heroSubtitle);
    expect(subtitle).toBeInTheDocument();

    const searchText = screen.getByRole('textbox', { name: `Search for ${heroPlaceholder}` });
    expect(searchText).toBeInTheDocument();
  });
});
