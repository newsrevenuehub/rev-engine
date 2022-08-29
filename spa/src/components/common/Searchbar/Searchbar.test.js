import { render, screen, fireEvent } from 'test-utils';

import Searchbar from './Searchbar';

const placeholderText = 'Pages';

describe('Searchbar', () => {
  it('should render searchbar default state', () => {
    render(<Searchbar placeholder={placeholderText} />);

    const searchText = screen.getByRole('textbox', { name: `Search for ${placeholderText}` });
    expect(searchText).toBeInTheDocument();

    const placeholder = screen.getByPlaceholderText(`Search ${placeholderText}...`);
    expect(placeholder).toBeInTheDocument();
  });

  it('should update searchbar value', () => {
    const onChange = jest.fn();
    const searchText = 'filter';
    render(<Searchbar placeholder={placeholderText} onChange={onChange} />);

    const searchbar = screen.getByRole('textbox', { name: `Search for ${placeholderText}` });
    expect(searchbar).toBeInTheDocument();
    expect(searchbar).toHaveAttribute('value', '');

    fireEvent.change(searchbar, { target: { value: searchText } });
    expect(searchbar).toHaveAttribute('value', searchText);
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
