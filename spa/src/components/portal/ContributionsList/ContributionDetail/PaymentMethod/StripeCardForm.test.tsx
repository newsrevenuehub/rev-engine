import { CardElementProps } from '@stripe/react-stripe-js';
import { axe } from 'jest-axe';
import { fireEvent, render, screen } from 'test-utils';
import StripeCardForm, { StripeCardFormProps } from './StripeCardForm';

jest.mock('@stripe/react-stripe-js', () => ({
  CardElement: ({ onChange }: CardElementProps) => (
    <div data-testid="mock-card-element">
      <button onClick={() => onChange?.({ complete: true } as any)}> onChange complete </button>
      <button onClick={() => onChange?.({ complete: false } as any)}> onChange incomplete </button>
      <button onClick={() => onChange?.({ error: { message: 'mock-error-message' } } as any)}>onChange error</button>
    </div>
  )
}));

function tree(props?: Partial<StripeCardFormProps>) {
  return render(
    <StripeCardForm onChangeCardComplete={jest.fn()} onChangeName={jest.fn()} name="test-name" {...props} />
  );
}

describe('StripeCardForm', () => {
  it('shows a text field for card owner name with the name prop as value', () => {
    tree({ name: 'test-name' });
    expect(screen.getByRole('textbox', { name: 'Name on Card' })).toBeVisible();
  });

  it('calls the onChangeName prop when the text field for card owner name changes', () => {
    const onChangeName = jest.fn();

    tree({ onChangeName });
    expect(onChangeName).not.toBeCalled();
    fireEvent.change(screen.getByRole('textbox', { name: 'Name on Card' }), { target: { value: 'change' } });
    expect(onChangeName.mock.calls).toEqual([['change']]);
  });

  it('shows a Stripe card element', () => {
    tree();
    expect(screen.getByTestId('mock-card-element')).toBeInTheDocument();
  });

  describe('When the card element emits a change event', () => {
    it('shows the error message if any is present', () => {
      tree();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      fireEvent.click(screen.getByText('onChange error'));
      expect(screen.getByRole('alert')).toHaveTextContent('mock-error-message');
    });

    it('calls the onChangeCardComplete prop with true if the element has been completed', () => {
      const onChangeCardComplete = jest.fn();

      tree({ onChangeCardComplete });
      expect(onChangeCardComplete).not.toBeCalled();
      fireEvent.click(screen.getByText('onChange complete'));
      expect(onChangeCardComplete.mock.calls).toEqual([[true]]);
    });

    it("calls the onChangeCardComplete prop with false if the element hasn't been completed", () => {
      const onChangeCardComplete = jest.fn();

      tree({ onChangeCardComplete });
      expect(onChangeCardComplete).not.toBeCalled();
      fireEvent.click(screen.getByText('onChange incomplete'));
      expect(onChangeCardComplete.mock.calls).toEqual([[false]]);
    });
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
