import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import EditableList, { EditableListProps } from './EditableList';

function tree(props?: Partial<EditableListProps>) {
  return render(<EditableList id="mock-id" onChange={jest.fn()} prompt="mock-prompt" value={['test1']} {...props} />);
}

describe('EditableList', () => {
  it('displays an item for every entry in the value prop', () => {
    tree({ value: ['test1', 'test2'] });
    expect(screen.getByText('test1')).toBeVisible();
    expect(screen.getByText('test2')).toBeVisible();
  });

  it('calls onChange when an entry is removed', () => {
    const onChange = jest.fn();

    tree({ onChange, value: ['test1', 'test2', 'test3'] });
    expect(onChange).not.toBeCalled();
    userEvent.click(screen.getByLabelText('Remove test2'));
    expect(onChange.mock.calls).toEqual([[['test1', 'test3']]]);
  });

  describe('The new item field', () => {
    it('calls onChange when a new entry is added', () => {
      const onChange = jest.fn();

      tree({ onChange, value: ['test1', 'test2', 'test3'] });
      userEvent.type(screen.getByLabelText('mock-prompt'), 'new-item');
      expect(onChange).not.toBeCalled();
      userEvent.click(screen.getByLabelText('Add'));
      expect(onChange.mock.calls).toEqual([[['test1', 'test2', 'test3', 'new-item']]]);
    });

    it('clears when a new entry is added', () => {
      tree();
      userEvent.type(screen.getByLabelText('mock-prompt'), 'new-item');
      userEvent.click(screen.getByLabelText('Add'));
      expect(screen.getByLabelText('mock-prompt')).toHaveValue('');
    });

    it("doesn't allow adding a blank item", () => {
      tree();
      userEvent.type(screen.getByLabelText('mock-prompt'), '');
      expect(screen.getByLabelText('Add')).toBeDisabled();
    });

    it("doesn't allow adding items that don't pass the validateNewValue prop test", () => {
      tree({ validateNewValue: (value: string) => (value === 'bad value' ? 'bad value' : undefined) });
      userEvent.type(screen.getByLabelText('mock-prompt'), 'bad value');
      expect(screen.getByLabelText('Add')).toBeDisabled();
    });

    it('does allow adding items that pass the validateNewValue prop test', () => {
      tree({ validateNewValue: (value: string) => (value === 'bad value' ? 'bad value' : undefined) });
      userEvent.type(screen.getByLabelText('mock-prompt'), 'good value');
      expect(screen.getByLabelText('Add')).toBeEnabled();
    });
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
