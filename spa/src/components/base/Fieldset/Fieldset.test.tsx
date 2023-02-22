import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import Fieldset, { FieldsetProps } from './Fieldset';

function tree(props?: Partial<FieldsetProps>) {
  return render(
    <Fieldset label="mock-label" {...props}>
      children
    </Fieldset>
  );
}

describe('Fieldset', () => {
  it('displays a fieldset containing its children', () => {
    tree();
    expect(screen.getByRole('group')).toHaveTextContent('children');
  });

  it('displays its label as a legend', () => {
    tree({ label: 'test-label' });
    expect(screen.getByRole('group')).toHaveAccessibleName('test-label');
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
