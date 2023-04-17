import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import CountrySelect, { CountrySelectProps } from './CountrySelect';

// This mock is to test that the select sorts on country name, not ISO code.

jest.mock('country-code-lookup', () => ({
  countries: [
    { country: 'CCC', iso2: 'cc' },
    { country: 'AAA', iso2: 'bb' },
    { country: 'BBB', iso2: 'aa' }
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
    // Set the value to an ISO code--note mocked country named BBB has ISO code
    // aa.
    tree({ value: 'aa' });

    // Test the user-visible value of the input in the DOM.
    expect(screen.getByRole('textbox')).toHaveValue('BBB');
  });

  it("selects nothing if the value doesn't match any country", () => {
    tree({ value: 'bad' });
    expect(screen.getByRole('textbox')).toHaveValue('');
  });

  describe('When the browser autofills the hidden input', () => {
    it('calls onChange if the value matches an option', () => {
      const onChange = jest.fn();

      tree({ onChange });
      expect(onChange).not.toBeCalled();
      userEvent.type(screen.getByTestId('autofill-proxy'), 'BBB');
      expect(onChange.mock.calls).toEqual([[expect.anything(), { isoCode: 'aa', label: 'BBB' }, 'select-option']]);
    });

    it("doesn't call onChange if the value doesn't match an option", () => {
      const onChange = jest.fn();

      tree({ onChange });
      userEvent.type(screen.getByTestId('autofill-proxy'), 'bad');
      expect(onChange).not.toBeCalled();
    });

    it('does nothing if onChange is not defined', () => {
      tree();
      expect(() => userEvent.type(screen.getByTestId('autofill-proxy'), 'BBB')).not.toThrow();
    });
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
