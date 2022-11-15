import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import { SearchableSelect, SearchableSelectProps } from './SearchableSelect';

interface TestOption {
  label: string;
  value: string;
}

describe('SearchableSelect', () => {
  function tree(props?: Partial<SearchableSelectProps<TestOption>>) {
    return render(
      <SearchableSelect
        label="mock-label"
        getOptionLabel={({ label }: { label: string }) => label}
        options={[
          { label: 'option1', value: '1' },
          { label: 'option2', value: '2' }
        ]}
        {...props}
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

  it('calls the onChange prop when an option is selected', () => {
    const onChange = jest.fn();

    tree({ onChange });
    expect(onChange).not.toBeCalled();
    userEvent.click(screen.getByRole('button', { name: 'Open' }));
    userEvent.click(screen.getByRole('option', { name: 'option1' }));
    expect(onChange).toBeCalledTimes(1);
    expect(onChange.mock.calls[0][1]).toEqual({ label: 'option1', value: '1' });
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
