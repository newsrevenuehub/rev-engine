import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import ValueOrPlaceholder, { ValueOrPlaceholderProps } from './ValueOrPlaceholder';

function tree(props?: Partial<ValueOrPlaceholderProps>) {
  return render(<ValueOrPlaceholder {...props}>children</ValueOrPlaceholder>);
}

describe('ValueOrPlaceholder', () => {
  it.each([[1], ['text'], ['0'], [' '], [true]])('renders children when value is %p', (value) => {
    tree({ value });
    expect(screen.getByText('children')).toBeVisible();
  });

  it.each([[0], [''], [false], [null], [undefined]])("doesn't render children when value is %p", (value) => {
    tree({ value });
    expect(screen.queryByText('children')).not.toBeInTheDocument();
  });

  it('is accessible when children are not rendered', async () => {
    const { container } = tree({ value: false });

    expect(await axe(container)).toHaveNoViolations();
  });

  it('is accessible when children are rendered', async () => {
    const { container } = tree({ value: true });

    expect(await axe(container)).toHaveNoViolations();
  });
});
