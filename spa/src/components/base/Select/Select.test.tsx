import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import { Select, SelectProps } from './Select';

describe('Select', () => {
  function tree(props?: Partial<SelectProps>) {
    return render(
      <Select
        value={1}
        options={[
          { label: 'option1', value: '1', selectedLabel: 'option1 selected' },
          { label: 'option2', value: '2' }
        ]}
        {...props}
      />
    );
  }

  it('renders a select', () => {
    tree();
    expect(screen.getByRole('button')).toBeEnabled();
  });

  it('renders options after the open button is clicked', () => {
    tree();
    userEvent.click(screen.getByRole('button'));
    expect(screen.getAllByRole('option')).toHaveLength(2);
    expect(screen.getByRole('option', { name: 'option1' })).toBeVisible();
    expect(screen.getByRole('option', { name: 'option2' })).toBeVisible();
  });

  it('calls the onChange prop when an option is selected', () => {
    const onChange = jest.fn();

    tree({ onChange });
    expect(onChange).not.toBeCalled();
    userEvent.click(screen.getByRole('button'));
    userEvent.click(screen.getByRole('option', { name: 'option1' }));
    expect(onChange).toBeCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ target: { value: '1' } }), expect.anything());
  });

  it("renders the option's selected label, and hides the menu label", () => {
    tree();
    expect(screen.getByText('option1')).not.toBeVisible();
    expect(screen.getByText('option1 selected')).toBeVisible();
  });

  it("renders the menu label when the option doesn't have selected label", () => {
    tree({ value: 2 });
    expect(screen.getAllByText('option2')).toHaveLength(2);
    expect(screen.queryByText('option1')).not.toBeInTheDocument();
    expect(screen.queryByText('option1 selected')).not.toBeInTheDocument();
  });

  it('passes through props on MenuItemProps to its menu items', () => {
    tree({
      MenuItemProps: { className: 'test-class' }
    });
    userEvent.click(screen.getByRole('button'));

    // Need to query by CSS class.
    // eslint-disable-next-line testing-library/no-node-access
    expect(document.querySelector('.test-class')).toBeInTheDocument();
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
