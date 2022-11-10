import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import SearchableSelect from './SearchableSelect';

describe('SearchableSelect', () => {
  function tree() {
    return render(
      <SearchableSelect
        label="mock-label"
        getOptionLabel={({ label }: { label: string }) => label}
        options={[
          { label: 'option1', value: '1' },
          { label: 'option2', value: '2' }
        ]}
      />
    );
  }

  it('renders a select', () => {
    tree();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('renders options after the open button is clicked', () => {
    tree();
    userEvent.click(screen.getByRole('button', { name: 'Open' }));
    expect(screen.getAllByRole('option')).toHaveLength(2);
    expect(screen.getByRole('option', { name: 'option1' })).toBeVisible();
    expect(screen.getByRole('option', { name: 'option2' })).toBeVisible();
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
