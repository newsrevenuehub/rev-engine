import { FormProvider, useForm } from 'react-hook-form';
import { useEffect, useCallback, useState } from 'react';
import useQueryString from 'hooks/useQueryString';
import PropTypes from 'prop-types';
import { Elements } from '@stripe/react-stripe-js';

import * as S from './DonationPage.styled';
// import useClearbit from 'hooks/useClearbit';
// import { getDefaultAmountForFreq } from 'components/donationPage/pageContent/DAmount';

// import { SALESFORCE_CAMPAIGN_ID_QUERYPARAM, FREQUENCY_QUERYPARAM, AMOUNT_QUERYPARAM } from 'settings';
import HeaderBar from './elements/headerBar/HeaderBar';
import Graphic from './elements/graphic/Graphic';
import PageHeading from './elements/pageHeading/PageHeading';
import Amount from './elements/form/amount/Amount';
import Frequency from './elements/form/frequency/Frequency';
import PayFees from './elements/form/payFees/PayFees';
import ContributionForm from './elements/form/Form';
import DonationPageSidebar from 'components/donationPage/elements/sidebar/DonationPageSidebar';
import DonationPageFooter from 'components/donationPage/elements/footer/Footer';
import validationSchema from './elements/form/schema';
import calculateStripeFee from 'utilities/calculateStripeFee';

const useYupValidationresolver = (validationSchema) =>
  useCallback(
    async (data) => {
      try {
        const values = await validationSchema.validate(data, { abortEary: false });
        return {
          values,
          errors: {}
        };
      } catch (errors) {
        return {
          values: {},
          errors: errors.inner.reduce((allErrors, currentError) => ({
            ...allErrors,
            [currentError.path]: {
              type: currentError.type ?? 'validation',
              message: currentError.message
            }
          }))
        };
      }
    },
    [validationSchema]
  );

// used in `DonationPage` in generation of submit button text
const intervalToAdverbMap = {
  one_time: 'once',
  month: 'monthly',
  year: 'yearly'
};

// Summary of what this component is for...
function DonationPage({ pageData, stripeClientSecret, stripePromise, liveView = false }) {
  // RHF configuration
  debugger;
  const resolver = useYupValidationresolver(validationSchema);
  const methods = useForm({ resolver });

  // orchestration of these fields happens in the RHF layer, where
  // different inputs are initiated by a watchable name.
  // We use RHF's built in watch functionality to update thet "global"
  // state values for amount, frequency, and agreePayFees, which are required
  // and set by constituent form parts, each registered with RHF in situ.
  const watchedAmountFormValue = methods.watch(Amount.defaultProps.name, null);
  const watchedFrequencyValue = methods.watch(Frequency.defaultProps.name, null);
  const watchedAgreePayFees = methods.watch(PayFees.defaultProps.name, null);

  // get an `amount` query parameter from the URL, which can prefil the form
  const amountFormParam = useQueryString('amount');

  // totalPaymentAmount is distinct from the amount the user has
  // chosen in the form. It's that amount plus fees if they agree.
  // It's this derived value that will get submitted to Stripe.
  const [totalPaymentAmount, setTotalPaymentAmount] = useState(0);
  const [fees, setFees] = useState(0);
  const [availableAmounts, setAvailableAmounts] = useState([]);
  const [swagThresholdMet, setswagThresholdMet] = useState(false);
  const [submitButtonText, setSubmitButtonText] = useState('');
  const [defaultAmount, setDefaultAmount] = useState(null);
  const [filteredDynamicElements, setFilteredDynamicElements] = useState([]);

  // set total amount based on amount + fees. this amount will be submitted
  // to payment provider, and also determines what's shown in submit button text.
  useEffect(() => {
    if (watchedAmountFormValue !== null) {
      setTotalPaymentAmount(watchedAmountFormValue + fees);
    }
  }, [watchedAmountFormValue, fees]);

  // calculate fees based on chosen contribution amount value
  useEffect(() => {
    if (watchedAmountFormValue !== null && watchedFrequencyValue !== null) {
      setFees(calculateStripeFee(watchedAmountFormValue, watchedFrequencyValue, pageData.isNonprofit));
    }
  }, [watchedAmountFormValue, watchedFrequencyValue, pageData.isNonprofit]);

  // select the available amounts given chosen frequency
  useEffect(() => {
    if (pageData.amountOptions && watchedFrequencyValue !== null) {
      setAvailableAmounts(pageData.amountOptions[watchedFrequencyValue].map((amount) => {}));
    }
  }, [pageData.amountOptions, watchedFrequencyValue]);

  // determine if swag threshold is met
  useEffect(() => {
    setswagThresholdMet(watchedAmountFormValue >= pageData.swagThreshold);
  }, [watchedAmountFormValue, pageData.swagThreshold]);

  // Generate submit button text based on total amount
  useEffect(() => {
    setSubmitButtonText(
      `Give ${pageData.currencySymbol ? pageData.currencySymbol + ' ' : ''}${
        watchedAmountFormValue ? watchedAmountFormValue + ' ' : ''
      }${intervalToAdverbMap[watchedFrequencyValue] || ''}}`
    );
  }, [pageData.currencySymbol, totalPaymentAmount, watchedAmountFormValue, watchedFrequencyValue]);

  // set defaultAmount based on query param if it's a valid amount
  // useEffect(() => {
  //   const raw = query.get('amount');
  //   if (!isNaN(parseFloat(raw))) {
  //     setDefaultAmount(parseFloat(amountFormParam));
  //   }
  // }, [amountFormParam, query]);

  //
  useEffect(() => {
    const paymentElementIndex = pageData.dynamicElements.indexOf((elem) => elem.type === 'DPayment');
    const paymentElement = paymentElementIndex >= 0 ? pageData.dynamicElements.pop(paymentElementIndex) : null;
    // move these two to bottom:
    // stripe element
    // pay fees
    //
    // remove
    setFilteredDynamicElements();
  });

  // useEffect on stripe secret
  const onSubmit = () => {
    console.log(totalPaymentAmount);
    // try submitting to stripe
    // submit to server with rest (or is that all metadata???)
    // stripe submission may reveal form errors in which case display
    // same with other fields
    // errors get fed back into form.
  };

  // TODO:
  // default checked index for frequency?

  const globalFormContext = {
    ...pageData,
    amount: watchedAmountFormValue,
    frequency: watchedFrequencyValue,
    presetAmounts: availableAmounts,
    defaultAmount,
    swagThresholdMet,
    agreePayFees: watchedAgreePayFees,

    // here
    // here
    // here
    // here
    reasonPromptRequired: true, // from page
    reasonPromptOptions: [], // from page
    inHonorDisplay: true, // from page
    inMemoryDisplay: true, // from page
    swagThresholdAmount: null, //,  from page
    optOutDefaultChecked: false, // from page
    dynamicElements: filteredDynamicElements.map((elem) => {
      // return the elem given the name
      debugger;
    }), // derived from page
    swagItemLabelText: '', // from page
    swagItemOptions: [], // from page
    onSubmit,
    // isLive,
    submitButtonText,
    // availableWallets,
    availableAmounts

    // WHERE DOES NEXT PAGE AFTER SUCCESS GET SET UP FOR REACT STRIPE ELEMENT?
  };
  //
  // page editor:
  // needs to know / set
  // - page one time amounts
  // - page monthly amounts
  // - page yearly amounts
  // - page include other option

  // Frequency
  // - *** need to add support for selected by default for the amounts (one timePickerDefaultProps, monthly, yearly)
  //  - need to add support for each one being enabled or not (not just open ended)

  // Stripe needs to know interval and amount-
  // - enable/disable card Payment (page)
  // - enable apple payFees (page)
  // - enable google fees (page)
  // - enable google payment (page)
  // - browser saved card (page) ???
  // - payfees option enabled

  // TODO: Turn this all into tailwind. This is bloat and inidrection and all these do is set a couple of simple
  // css settings, ofteintimes.
  return (
    <S.DonationPage data-testid="donation-page">
      <HeaderBar page={pageData} />
      <S.PageMain>
        <S.SideOuter>
          <S.SideInner>
            <PageHeading heading={pageData.heading} />
            <S.DonationContent>
              <Graphic graphic={pageData.graphic} />
              <Elements options={{ clientSecret: stripeClientSecret }} stripe={stripePromise}>
                <FormProvider {...methods}>
                  <ContributionForm {...globalFormContext} />
                </FormProvider>
              </Elements>
            </S.DonationContent>
          </S.SideInner>
        </S.SideOuter>
        <DonationPageSidebar sidebarContent={pageData?.sidebar_elements} live={liveView} />
      </S.PageMain>
      <DonationPageFooter page={pageData} />
    </S.DonationPage>
  );
}

DonationPage.defaultProps = {
  liveView: false
};

DonationPage.propTypes = {
  pageData: PropTypes.shape({}).isRequired,
  liveView: PropTypes.bool.isRequired,
  stripePromise: PropTypes.shape({
    then: PropTypes.func.isRequired,
    catch: PropTypes.func.isRequired
  }).isRequired,
  stripeClientSecret: PropTypes.string.isRequired
};
export default DonationPage;
