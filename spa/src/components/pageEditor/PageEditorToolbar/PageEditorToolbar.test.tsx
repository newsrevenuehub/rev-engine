import { axe } from 'jest-axe';
import { fireEvent, render, screen } from 'test-utils';
import PageEditorToolbar, { PageEditorToolbarProps } from './PageEditorToolbar';

function tree(props?: Partial<PageEditorToolbarProps>) {
  return render(
    <PageEditorToolbar onDelete={jest.fn()} onEdit={jest.fn()} onPreview={jest.fn()} onSave={jest.fn()} {...props} />
  );
}

describe('PageEditorToolbar', () => {
  it.each([
    ['View', 'onPreview'],
    ['Edit', 'onEdit'],
    ['Save', 'onSave'],
    ['Delete', 'onDelete']
  ])('shows a %s button that calls the %s prop when clicked', (label, prop) => {
    const clickListener = jest.fn();

    tree({ [prop as keyof PageEditorToolbarProps]: clickListener });
    expect(clickListener).not.toBeCalled();
    fireEvent.click(screen.getByRole('button', { name: label }));
    expect(clickListener).toBeCalledTimes(1);
  });

  it('selects neither View nor Edit button by default', () => {
    tree();
    expect(screen.getByRole('button', { name: 'Edit' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'View' })).toHaveAttribute('aria-pressed', 'false');
  });

  it.each([
    ['Edit', 'edit'],
    ['View', 'preview']
  ])('selects only the %s button when the selected prop is "%s"', (label, selected) => {
    tree({ selected: selected as 'edit' | 'preview' });
    expect(screen.getByRole('button', { name: label })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: label === 'Edit' ? 'View' : 'Edit' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
  });

  it('enables the Save button by default', () => {
    tree();
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
  });

  it('disables the Save button if the saveDisabled prop is true', () => {
    tree({ saveDisabled: true });
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
