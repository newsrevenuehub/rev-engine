import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import SearchableSelect from './CountrySelect';

jest.mock('react-select');

describe('SearchableSelect', () => {
  function tree() {
    return render(
      <>
        <label htmlFor="select">select</label>
        <SearchableSelect
          inputId="select"
          name="mock-name"
          options={[
            { label: 'option1', value: '1' },
            { label: 'option2', value: '2' }
          ]}
        />
      </>
    );
  }

  it('renders a select', () => {
    tree();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
