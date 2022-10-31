import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import { ModalFooter, ModalFooterProps } from './ModalFooter';

describe('ModalFooter', () => {
  function tree(props?: Partial<ModalFooterProps>) {
    return render(<ModalFooter {...props}>children</ModalFooter>);
  }

  it('displays its children', () => {
    tree();
    expect(screen.getByText('children')).toBeInTheDocument();
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
