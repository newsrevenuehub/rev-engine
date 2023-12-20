import { axe } from 'jest-axe';
import { fireEvent, render, screen, within } from 'test-utils';
import DonationPageForm, { DonationPageFormProps } from './DonationPageForm';
import { TextField } from 'components/base';
import { DonationPageContext } from './DonationPage';

function tree(props?: Partial<DonationPageFormProps>, context?: any) {
  return render(
    <DonationPageContext.Provider value={{ amount: 123, mailingCountry: 'us', ...context }}>
      <DonationPageForm onSubmit={jest.fn()} {...props}>
        <TextField id="required" label="Required" required />
        <TextField id="optional" label="Optional" />
      </DonationPageForm>
    </DonationPageContext.Provider>
  );
}

describe('DonationPageForm', () => {
  it('shows its children', () => {
    tree();
    expect(screen.getByRole('textbox', { name: 'Required' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Optional' })).toBeInTheDocument();
  });

  describe('When disabled', () => {
    it('disables its submit button', () => {
      tree({ disabled: true });
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('does nothing when the form is submitted directly, even if context and all child inputs are valid', () => {
      const onSubmit = jest.fn();

      tree({ onSubmit, disabled: true });
      fireEvent.change(screen.getByRole('textbox', { name: 'Required' }), { target: { value: 'a' } });
      fireEvent.submit(screen.getByTestId('donation-page-form'));
      expect(onSubmit).not.toBeCalled();
    });
  });

  describe('When not disabled', () => {
    describe('The submit button', () => {
      it('is enabled', () => {
        tree();
        expect(screen.getByRole('button')).toBeEnabled();
      });

      it('shows "Continue to Payment" if the amount in context is valid', () => {
        tree();
        expect(screen.getByRole('button')).toHaveTextContent('donationPage.mainPage.continueToPayment');
      });

      it('shows "Enter a Valid Amount" if the amount in context isn\'t valid', () => {
        tree({}, { amount: NaN });
        expect(screen.getByRole('button')).toHaveTextContent('donationPage.mainPage.enterValidAmount');
      });

      it('shows a spinner if the loading prop is true', () => {
        tree({ loading: true });
        expect(within(screen.getByRole('button')).getByTestId('loading')).toBeInTheDocument();
      });

      it('calls onSubmit when called if all child inputs are valid and context is valid', () => {
        const onSubmit = jest.fn();

        tree({ onSubmit });
        fireEvent.change(screen.getByRole('textbox', { name: 'Required' }), { target: { value: 'a' } });
        expect(onSubmit).not.toBeCalled();
        fireEvent.click(screen.getByRole('button'));
        expect(onSubmit).toBeCalledTimes(1);
      });

      it("doesn't do anything if the amount in context isn't a number", () => {
        const onSubmit = jest.fn();

        tree({ onSubmit }, { amount: NaN });
        fireEvent.change(screen.getByRole('textbox', { name: 'Required' }), { target: { value: 'a' } });
        fireEvent.click(screen.getByRole('button'));
        expect(onSubmit).not.toBeCalled();
      });

      it("doesn't do anything if mailingCountry in context is undefined", () => {
        const onSubmit = jest.fn();

        tree({ onSubmit }, { mailingCountry: undefined });
        fireEvent.change(screen.getByRole('textbox', { name: 'Required' }), { target: { value: 'a' } });
        fireEvent.click(screen.getByRole('button'));
        expect(onSubmit).not.toBeCalled();
      });

      it("doesn't do anything if mailingCountry in context is an empty string", () => {
        const onSubmit = jest.fn();

        tree({ onSubmit }, { mailingCountry: '' });
        fireEvent.change(screen.getByRole('textbox', { name: 'Required' }), { target: { value: 'a' } });
        fireEvent.click(screen.getByRole('button'));
        expect(onSubmit).not.toBeCalled();
      });

      it("doesn't do anything if any child input is invalid", () => {
        const onSubmit = jest.fn();

        tree({ onSubmit });
        fireEvent.click(screen.getByRole('button'));
        expect(onSubmit).not.toBeCalled();
      });
    });

    describe('And the form is submitted directly', () => {
      it('calls onSubmit when called if all child inputs are valid and context is valid', () => {
        const onSubmit = jest.fn();

        tree({ onSubmit });
        fireEvent.change(screen.getByRole('textbox', { name: 'Required' }), { target: { value: 'a' } });
        expect(onSubmit).not.toBeCalled();
        fireEvent.submit(screen.getByTestId('donation-page-form'));
        expect(onSubmit).toBeCalledTimes(1);
      });

      it("doesn't do anything if the amount in context isn't a number", () => {
        const onSubmit = jest.fn();

        tree({ onSubmit }, { amount: NaN });
        fireEvent.change(screen.getByRole('textbox', { name: 'Required' }), { target: { value: 'a' } });
        fireEvent.submit(screen.getByTestId('donation-page-form'));
        expect(onSubmit).not.toBeCalled();
      });

      it("doesn't do anything if mailingCountry in context is undefined", () => {
        const onSubmit = jest.fn();

        tree({ onSubmit }, { mailingCountry: undefined });
        fireEvent.change(screen.getByRole('textbox', { name: 'Required' }), { target: { value: 'a' } });
        fireEvent.submit(screen.getByTestId('donation-page-form'));
        expect(onSubmit).not.toBeCalled();
      });

      it("doesn't do anything if mailingCountry in context is an empty string", () => {
        const onSubmit = jest.fn();

        tree({ onSubmit }, { mailingCountry: '' });
        fireEvent.change(screen.getByRole('textbox', { name: 'Required' }), { target: { value: 'a' } });
        fireEvent.submit(screen.getByTestId('donation-page-form'));
        expect(onSubmit).not.toBeCalled();
      });

      it("doesn't do anything if any child input is invalid", () => {
        const onSubmit = jest.fn();

        tree({ onSubmit });
        fireEvent.submit(screen.getByTestId('donation-page-form'));
        expect(onSubmit).not.toBeCalled();
      });
    });
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
