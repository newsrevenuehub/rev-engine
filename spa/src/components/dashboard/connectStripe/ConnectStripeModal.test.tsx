import { axe } from 'jest-axe';
import { fireEvent, render, screen } from 'test-utils';
import ConnectStripeModal, { ConnectStripeModalProps } from './ConnectStripeModal';

function tree(props?: Partial<ConnectStripeModalProps>) {
  return render(<ConnectStripeModal onClose={jest.fn()} onConnectStripe={jest.fn()} open {...props} />);
}

describe('ConnectStripeModal', () => {
  it("doesn't display anything if the open prop is false", () => {
    tree({ open: false });
    expect(document.body).toHaveTextContent('');
  });

  describe('When the open prop is true', () => {
    it('displays explanatory text', () => {
      tree();
      expect(
        screen.getByText(
          "To accept contributions, you'll need to set up a payment processor. We use Stripe because it's speedy and secure. Create and connect to a Stripe account in one easy step."
        )
      ).toBeVisible();
    });

    it('displays a Connect Now button which calls onConnectStripe when clicked', () => {
      const onConnectStripe = jest.fn();

      tree({ onConnectStripe });
      expect(onConnectStripe).not.toBeCalled();
      fireEvent.click(screen.getByRole('button', { name: 'Connect Now' }));
      expect(onConnectStripe).toBeCalled();
    });

    it('displays a "I\'ll Connect Later" button which calls onClose when clicked', () => {
      const onClose = jest.fn();

      tree({ onClose });
      expect(onClose).not.toBeCalled();
      fireEvent.click(screen.getByRole('button', { name: "I'll connect to Stripe later" }));
      expect(onClose).toBeCalled();
    });

    it('is accessible', async () => {
      const { container } = tree({ open: true });

      expect(await axe(container)).toHaveNoViolations();
    });
  });
});
