import PropTypes, { InferProps } from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FormEvent, ReactChild, forwardRef, useImperativeHandle, useRef } from 'react';
import { usePage } from './DonationPage';
import { Spinner, SubmitButton } from './DonationPageForm.styled';

const DonationPageFormPropTypes = {
  children: PropTypes.node.isRequired,
  disabled: PropTypes.bool,
  loading: PropTypes.bool,
  onSubmit: PropTypes.func.isRequired
};

export type DonationPageFormProps = InferProps<typeof DonationPageFormPropTypes>;

/**
 * Wraps displayed elements in a form. This doesn't create a payment directly,
 * but instead manages input validation before this happens.
 */
export const DonationPageForm = forwardRef(({ children, disabled, loading, onSubmit }: DonationPageFormProps, ref) => {
  // We make use of the forwarded ref below.
  // See https://stackoverflow.com/a/68163315
  const innerRef = useRef<HTMLFormElement>(null);
  const { amount, mailingCountry } = usePage();
  const { t } = useTranslation();
  const amountIsValid = Number.isFinite(amount);
  useImperativeHandle(ref, () => innerRef.current!, []);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();

    // Special case with mailingCountry. This is an autocomplete textfield that
    // could have a value in the DOM, but not a valid one in state. The scenario
    // we're handling is that the user has entered nonmatching text into the
    // field, then hit Enter, triggering form submit here. (If they hit Enter
    // with matching text, the input will select the first match and we never
    // get called.) Only in this case will the field have some value in the DOM.
    // If the user changes focus, then the component reverts the field back to
    // either an empty state or the previously valid choice.
    //
    // In this case, we stop the submission from occurring. The user will remain
    // on the country field, and they can either focus a different element or
    // edit their selection.

    if (disabled || !amountIsValid || !innerRef.current || !mailingCountry) {
      return;
    }

    // Check validity of all child inputs and stop if any are invalid. Normally,
    // we would do this kind of validation in React, but parts of the form are
    // uncontrolled.

    if (innerRef.current.reportValidity()) {
      onSubmit();
    }
  }

  let buttonLabel: ReactChild = amountIsValid
    ? t('donationPage.mainPage.continueToPayment')
    : t('donationPage.mainPage.enterValidAmount');

  if (loading) {
    buttonLabel = <Spinner data-testid="loading" aria-label="Loading" size={32} />;
  }

  return (
    <form data-testid="donation-page-form" onSubmit={handleSubmit} ref={innerRef}>
      {children}
      <SubmitButton color="primaryDark" disabled={disabled || !amountIsValid} fullWidth size="extraLarge" type="submit">
        {buttonLabel}
      </SubmitButton>
    </form>
  );
});

DonationPageForm.propTypes = DonationPageFormPropTypes;
export default DonationPageForm;
