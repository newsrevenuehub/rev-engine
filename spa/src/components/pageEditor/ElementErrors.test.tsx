import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import ElementErrors, { ElementErrorsProps } from './ElementErrors';

const mockError1 = { element: 'mock-element-1', message: 'mock-message-1' };
const mockError2 = { element: 'mock-element-2', message: 'mock-message-2' };

function tree(props?: Partial<ElementErrorsProps>) {
  return render(<ElementErrors errors={[mockError1]} {...props} />);
}

describe('ElementErrors', () => {
  it('displays nothing if there are no errors', () => {
    tree({ errors: [] });
    expect(document.body.textContent).toBe('');
  });

  describe('When errors are passed to it', () => {
    it('displays an explanation', () => {
      tree();
      expect(screen.getByText('The following elements are required for your page to function properly:')).toBeVisible();
    });

    it('displays each error message', () => {
      tree({ errors: [mockError1, mockError2] });
      expect(screen.getByText(mockError1.message)).toBeVisible();
      expect(screen.getByText(mockError2.message)).toBeVisible();
    });

    it('is accessible', async () => {
      const { container } = tree();

      expect(await axe(container)).toHaveNoViolations();
    });
  });
});
