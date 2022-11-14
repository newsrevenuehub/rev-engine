import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import CountrySelect, { CountrySelectProps } from './CountrySelect';

// This mock is to test that the select sorts on country name, not FIPS code.

jest.mock('country-code-lookup', () => ({
  countries: [
    { country: 'CCC', fips: 'cc' },
    { country: 'AAA', fips: 'bb' },
    { country: 'BBB', fips: 'aa' }
  ]
}));

describe('CountrySelect', () => {
  function tree(props?: Partial<CountrySelectProps>) {
    return render(<CountrySelect label="Country" value="" {...props} />);
  }

  it('renders a select', () => {
    tree();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('displays countries in alphabetical order', () => {
    tree();
    userEvent.click(screen.getByRole('button', { name: 'Open' }));

    const options = Array.from(screen.getAllByRole('option')).map(({ textContent }) => textContent);

    expect(options).toEqual(['AAA', 'BBB', 'CCC']);
  });

  it('selects the correct option based on the value prop', () => {
    tree({ value: 'aa' });
    expect(screen.getByRole('textbox')).toHaveValue('BBB'); // because it uses FIPS code as value, not country name
  });

  it("selects nothing if the value doesn't match any country", () => {
    tree({ value: 'bad' });
    expect(screen.getByRole('textbox')).toHaveValue('');
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
