import { axe } from 'jest-axe';
import { render, screen, fireEvent } from 'test-utils';

import Searchbar, { SearchbarProps } from './Searchbar';

const placeholderText = 'mock-search';

describe('Searchbar', () => {
  function tree(props?: Partial<SearchbarProps>) {
    return render(<Searchbar placeholder={placeholderText} {...props} />);
  }

  it('should render searchbar default state', () => {
    tree();

    const searchText = screen.getByRole('textbox', { name: `Search for ${placeholderText}` });
    expect(searchText).toBeInTheDocument();

    const placeholder = screen.getByPlaceholderText(`Search ${placeholderText}...`);
    expect(placeholder).toBeInTheDocument();
  });

  it('should update searchbar value', () => {
    const onChange = jest.fn();
    const searchText = 'filter';
    tree({ onChange });

    const searchbar = screen.getByRole('textbox', { name: `Search for ${placeholderText}` });
    expect(searchbar).toBeInTheDocument();
    expect(searchbar).toHaveValue('');

    fireEvent.change(searchbar, { target: { value: searchText } });
    expect(searchbar).toHaveValue(searchText);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('should be accessible', async () => {
    const { container } = tree();
    // axe seems to trip over contrast detection on this component.
    // See https://github.com/nickcolley/jest-axe/issues/147

    expect(await axe(container, { rules: { 'color-contrast': { enabled: false } } })).toHaveNoViolations();
  });
});
