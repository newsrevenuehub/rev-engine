import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import PaymentEditor, { PaymentEditorProps } from './PaymentEditor';

function tree(props?: Partial<PaymentEditorProps>) {
  return render(<PaymentEditor elementContent={{ stripe: [] }} onChangeElementContent={jest.fn()} {...props} />);
}

describe('PaymentEditor', () => {
  it('displays explanatory text', () => {
    tree();
    expect(
      screen.getByText(
        "Configure the ability of your contributors to pay transaction fees so they won't be deducted from your payout."
      )
    ).toBeVisible();
    expect(screen.getByText('Available payment methods must be configured in Stripe.')).toBeVisible();
  });

  it('shows a checkbox to control whether to give users the option of paying fees', () => {
    tree();
    // The underlying component doesn't render as visible, so we have to use a weaker assertion.
    expect(screen.getByRole('checkbox', { name: 'Offer option to pay payment provider fees' })).toBeInTheDocument();
  });

  it('shows a checkbox to control whether to make users pay fees by default', () => {
    tree();
    // The underlying component doesn't render as visible, so we have to use a weaker assertion.
    expect(screen.getByRole('checkbox', { name: 'Selected by default' })).toBeInTheDocument();
  });

  describe('When the element has offerPayFees set to true', () => {
    it('checks the relevant checkbox', () => {
      tree({ elementContent: { offerPayFees: true, stripe: [] } });
      expect(screen.getByRole('checkbox', { name: 'Offer option to pay payment provider fees' })).toBeChecked();
    });

    it("sets the element's offerPayFees property to false when the relevant checkbox is unchecked", () => {
      const onChangeElementContent = jest.fn();

      tree({
        onChangeElementContent,
        elementContent: { offerPayFees: true, payFeesDefault: true, stripe: ['existing'] }
      });
      expect(onChangeElementContent).not.toBeCalled();
      userEvent.click(screen.getByRole('checkbox', { name: 'Offer option to pay payment provider fees' }));
      expect(onChangeElementContent.mock.calls).toEqual([
        [{ offerPayFees: false, payFeesDefault: true, stripe: ['existing'] }]
      ]);
    });
  });

  describe('When the element has offerPayFees set to false', () => {
    it('unchecks the relevant checkbox', () => {
      tree({ elementContent: { offerPayFees: false, stripe: [] } });
      expect(screen.getByRole('checkbox', { name: 'Offer option to pay payment provider fees' })).not.toBeChecked();
    });

    it('disables the checkbox related to defaulting to pay fees', () => {
      tree({ elementContent: { offerPayFees: false, stripe: [] } });
      expect(screen.getByRole('checkbox', { name: 'Selected by default' })).toBeDisabled();
    });

    it("sets the element's offerPayFees property to true when the relevant checkbox is checked", () => {
      const onChangeElementContent = jest.fn();

      tree({
        onChangeElementContent,
        elementContent: { offerPayFees: false, payFeesDefault: false, stripe: ['existing'] }
      });
      expect(onChangeElementContent).not.toBeCalled();
      userEvent.click(screen.getByRole('checkbox', { name: 'Offer option to pay payment provider fees' }));
      expect(onChangeElementContent.mock.calls).toEqual([
        [{ offerPayFees: true, payFeesDefault: false, stripe: ['existing'] }]
      ]);
    });
  });

  describe('When the element has payFeesDefault set to true', () => {
    it('checks the relevant checkbox', () => {
      tree({ elementContent: { payFeesDefault: true, stripe: [] } });
      expect(screen.getByRole('checkbox', { name: 'Selected by default' })).toBeChecked();
    });

    it('enables the checkbox related to defaulting to pay fees', () => {
      tree({ elementContent: { offerPayFees: true, stripe: [] } });
      expect(screen.getByRole('checkbox', { name: 'Selected by default' })).toBeEnabled();
    });

    it("sets the element's payFeesDefault property to false when the relevant checkbox is unchecked", () => {
      const onChangeElementContent = jest.fn();

      tree({
        onChangeElementContent,
        elementContent: { offerPayFees: true, payFeesDefault: true, stripe: ['existing'] }
      });
      expect(onChangeElementContent).not.toBeCalled();
      userEvent.click(screen.getByRole('checkbox', { name: 'Selected by default' }));
      expect(onChangeElementContent.mock.calls).toEqual([
        [{ offerPayFees: true, payFeesDefault: false, stripe: ['existing'] }]
      ]);
    });
  });

  describe('When the element has payFeesDefault set to false', () => {
    it('unchecks the relevant checkbox', () => {
      tree({ elementContent: { payFeesDefault: false, stripe: [] } });
      expect(screen.getByRole('checkbox', { name: 'Selected by default' })).not.toBeChecked();
    });

    it("sets the element's payFeesDefault property to true when the relevant checkbox is checked", () => {
      const onChangeElementContent = jest.fn();

      tree({
        onChangeElementContent,
        elementContent: { offerPayFees: true, payFeesDefault: true, stripe: ['existing'] }
      });
      expect(onChangeElementContent).not.toBeCalled();
      userEvent.click(screen.getByRole('checkbox', { name: 'Selected by default' }));
      expect(onChangeElementContent.mock.calls).toEqual([
        [{ offerPayFees: true, payFeesDefault: false, stripe: ['existing'] }]
      ]);
    });
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
