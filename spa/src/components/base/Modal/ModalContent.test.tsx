import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import { ModalContent, ModalContentProps } from './ModalContent';

describe('ModalContent', () => {
  function tree(props?: Partial<ModalContentProps>) {
    return render(<ModalContent {...props}>children</ModalContent>);
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
