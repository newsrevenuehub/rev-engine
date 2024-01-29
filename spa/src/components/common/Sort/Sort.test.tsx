import { axe } from 'jest-axe';
import { render, screen, waitFor } from 'test-utils';
import userEvent from '@testing-library/user-event';

import Sort, { SortProps } from './Sort';

const onChange = jest.fn();

describe('Sort', () => {
  function tree(props?: Partial<SortProps>) {
    return render(
      <Sort
        id="sort"
        onChange={onChange}
        options={[
          { label: 'option1 label', value: '1', selectedLabel: 'option1 selected' },
          { label: 'option2', value: '2', selectedLabel: 'option2 selected' }
        ]}
        {...props}
      />
    );
  }

  it('should render Sort default state', () => {
    tree();

    expect(screen.getByText('Sort:')).toBeVisible();
    expect(screen.getByRole('button')).toBeInTheDocument();
    expect(screen.getByText('option1 selected')).toBeVisible();
    expect(screen.getByText('option1 label')).not.toBeVisible();
  });

  it('should update Sort value', async () => {
    tree();

    expect(screen.getByText('option1 selected')).toBeVisible();
    expect(screen.queryByText('option2 selected')).not.toBeInTheDocument();

    userEvent.click(screen.getByRole('button'));
    userEvent.click(screen.getByRole('option', { name: 'option2' }));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('2');

    await waitFor(() => expect(screen.getByText('option2 selected')).toBeVisible());
    expect(screen.queryByText('option1 selected')).not.toBeInTheDocument();
  });

  it('should be accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
