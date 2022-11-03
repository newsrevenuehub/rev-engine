import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import CountrySelect from './CountrySelect';

// This mock is to test that the select sorts on country name, not FIPS code.

jest.mock('country-code-lookup', () => ({
  countries: [
    { country: 'CCC', fips: 'cc' },
    { country: 'AAA', fips: 'bb' },
    { country: 'BBB', fips: 'aa' }
  ]
}));

jest.mock('react-select');

describe('CountrySelect', () => {
  function tree() {
    return render(
      <>
        <label htmlFor="select">select</label>
        <CountrySelect inputId="select" name="mock-name" />
      </>
    );
  }

  it('renders a select', () => {
    tree();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('displays countries in alphabetical order', () => {
    tree();

    const options = Array.from(screen.getByRole('combobox').querySelectorAll('option')).map(
      ({ textContent }) => textContent
    );

    expect(options).toEqual(['AAA', 'BBB', 'CCC']);
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
