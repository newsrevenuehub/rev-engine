import userEvent from '@testing-library/user-event';
import { EditInterfaceContext } from 'components/pageEditor/editInterface/EditInterface';
import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import PaymentEditor from './PaymentEditor';

interface MockEditInterfaceContext {
  elementContent: Record<string, any>;
  setElementContent: (props: Record<string, any>) => void;
}

function tree(context?: Partial<MockEditInterfaceContext>) {
  return render(
    <EditInterfaceContext.Provider value={{ setElementContent: jest.fn(), elementContent: {}, ...context }}>
      <PaymentEditor />
    </EditInterfaceContext.Provider>
  );
}

describe('PaymentEditor', () => {
  function getOfferToPayFeesCheckbox() {
    // This control is not labelled properly.

    return screen.getAllByRole('checkbox')[0];
  }

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
    expect(getOfferToPayFeesCheckbox()).toBeVisible();
  });

  it('shows a checkbox to control whether to make users pay fees by default', () => {
    tree();
    // The underlying component doesn't render as visible, so we have to use a weaker assertion.
    expect(screen.getByRole('checkbox', { name: 'selected by default' })).toBeInTheDocument();
  });

  describe('When the element has offerPayFees set to true', () => {
    it('checks the relevant checkbox', () => {
      tree({ elementContent: { offerPayFees: true } });
      expect(getOfferToPayFeesCheckbox()).toBeChecked();
    });

    it("sets the element's offerPayFees property to false when the relevant checkbox is unchecked", () => {
      const setElementContent = jest.fn();

      tree({ setElementContent, elementContent: { offerPayFees: true, unrelated: 'preserved' } });
      expect(setElementContent).not.toBeCalled();
      userEvent.click(getOfferToPayFeesCheckbox());
      expect(setElementContent.mock.calls).toEqual([[{ offerPayFees: false, unrelated: 'preserved' }]]);
    });
  });

  describe('When the element has offerPayFees set to false', () => {
    it('unchecks the relevant checkbox', () => {
      tree({ elementContent: { offerPayFees: false } });
      expect(getOfferToPayFeesCheckbox()).not.toBeChecked();
    });

    it('disables the checkbox related to defaulting to pay fees', () => {
      tree({ elementContent: { offerPayFees: false } });
      expect(screen.getByRole('checkbox', { name: 'selected by default' })).toBeDisabled();
    });

    it("sets the element's offerPayFees property to true when the relevant checkbox is checked", () => {
      const setElementContent = jest.fn();

      tree({ setElementContent, elementContent: { offerPayFees: false, unrelated: 'preserved' } });
      expect(setElementContent).not.toBeCalled();
      userEvent.click(getOfferToPayFeesCheckbox());
      expect(setElementContent.mock.calls).toEqual([[{ offerPayFees: true, unrelated: 'preserved' }]]);
    });
  });

  describe('When the element has payFeesDefault set to true', () => {
    it('checks the relevant checkbox', () => {
      tree({ elementContent: { payFeesDefault: true } });
      expect(screen.getByRole('checkbox', { name: 'selected by default' })).toBeChecked();
    });

    it('enables the checkbox related to defaulting to pay fees', () => {
      tree({ elementContent: { offerPayFees: true } });
      expect(screen.getByRole('checkbox', { name: 'selected by default' })).not.toBeDisabled();
    });

    it("sets the element's payFeesDefault property to false when the relevant checkbox is unchecked", () => {
      const setElementContent = jest.fn();

      tree({ setElementContent, elementContent: { offerPayFees: true, payFeesDefault: true, unrelated: 'preserved' } });
      expect(setElementContent).not.toBeCalled();
      userEvent.click(screen.getByRole('checkbox', { name: 'selected by default' }));
      expect(setElementContent.mock.calls).toEqual([
        [{ offerPayFees: true, payFeesDefault: false, unrelated: 'preserved' }]
      ]);
    });
  });

  describe('When the element has payFeesDefault set to false', () => {
    it('unchecks the relevant checkbox', () => {
      tree({ elementContent: { payFeesDefault: false } });
      expect(screen.getByRole('checkbox', { name: 'selected by default' })).not.toBeChecked();
    });

    it("sets the element's payFeesDefault property to true when the relevant checkbox is checked", () => {
      const setElementContent = jest.fn();

      tree({ setElementContent, elementContent: { offerPayFees: true, payFeesDefault: true, unrelated: 'preserved' } });
      expect(setElementContent).not.toBeCalled();
      userEvent.click(screen.getByRole('checkbox', { name: 'selected by default' }));
      expect(setElementContent.mock.calls).toEqual([
        [{ offerPayFees: true, payFeesDefault: false, unrelated: 'preserved' }]
      ]);
    });
  });

  it('is accessible', async () => {
    const { container } = tree();

    // `label` fails because of problems with the underlying components not
    // labelling themselves correctly.

    expect(await axe(container, { rules: { label: { enabled: false } } })).toHaveNoViolations();
  });
});
