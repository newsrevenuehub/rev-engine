import { FormProvider, useForm } from 'react-hook-form';
import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Elements } from '@stripe/react-stripe-js';
import { yupResolver } from '@hookform/resolvers/yup';

import * as S from './DonationPage.styled';
import useClearbit from 'hooks/useClearbit';

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
import DonationPageDisclaimer from 'components/donationPage/elements/disclaimer/Disclaimer';

// used in `DonationPage` in generation of submit button text
const intervalToAdverbMap = {
  one_time: 'once',
  month: 'monthly',
  year: 'yearly'
};

const intervalToNoun = {
  one_time: 'once',
  month: 'month',
  year: 'year'
};

const AltElementsContainer = ({ children, ...rest }) => {
  return <div>{children}</div>;
};

// Summary of what this component is for...
function DonationPage({ defaultAmount, pageData, stripeClientSecret, stripePromise, liveView = false }) {
  useClearbit(liveView);

  // RHF configuration
  const resolver = yupResolver(validationSchema);
  const methods = useForm({ resolver });

  // orchestration of these fields happens in the RHF layer, where
  // different inputs are initiated by a watchable name.
  // We use RHF's built in watch functionality to update the "global"
  // state values for amount, frequency, and agreePayFees, which are required
  // and set by constituent form parts, each registered with RHF in situ.
  const watchedAmountFormValue = methods.watch(Amount.defaultProps.name, 0);

  const watchedFrequencyValue = methods.watch(Frequency.defaultProps.name, pageData.frequencyOptions[0].value);
  const watchedAgreePayFees = methods.watch(PayFees.defaultProps.name, null);
  // totalPaymentAmount is distinct from the amount the user has
  // chosen in the form. It's that amount plus fees if they agree.
  // It's this derived value that will get submitted to Stripe.
  const [totalPaymentAmount, setTotalPaymentAmount] = useState(0);
  const [fees, setFees] = useState(0);
  const [availableAmounts, setAvailableAmounts] = useState(pageData.amountOptions[pageData.frequencyOptions[0].value]);
  const [swagThresholdMet, setswagThresholdMet] = useState(false);
  const [submitButtonText, setSubmitButtonText] = useState('');
  const [payFeesLabelText, setPayFeesLabelText] = useState('');

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
      setAvailableAmounts(pageData.amountOptions[watchedFrequencyValue]);
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
      }${intervalToAdverbMap[watchedFrequencyValue] || ''}`
    );
  }, [pageData.currencySymbol, totalPaymentAmount, watchedAmountFormValue, watchedFrequencyValue]);

  useEffect(() => {
    setPayFeesLabelText(`${pageData.currencySymbol}${fees} ${intervalToAdverbMap[watchedFrequencyValue]}`);
  }, [fees, pageData.currencySymbol, watchedAmountFormValue, watchedFrequencyValue]);

  // useEffect on stripe secret
  const onSubmit = (data) => {
    debugger;
    console.log(totalPaymentAmount);
    // try submitting to stripe
    // submit to server with rest (or is that all metadata???)
    // stripe submission may reveal form errors in which case display
    // same with other fields
    // errors get fed back into form.
  };

  const globalFormContext = {
    ...pageData,
    amount: watchedAmountFormValue,
    frequencyString: intervalToNoun[watchedFrequencyValue],
    frequency: watchedFrequencyValue,
    presetAmounts: availableAmounts,
    defaultAmount,
    swagThresholdMet,
    agreePayFees: watchedAgreePayFees,
    reasonPromptRequired: true,
    reasonPromptOptions: [],
    inHonorDisplay: true,
    inMemoryDisplay: true,
    swagThresholdAmount: null,
    optOutDefaultChecked: false,
    swagItemLabelText: '',
    swagItemOptions: [],
    submitButtonText,
    availableAmounts

    // WHERE DOES NEXT PAGE AFTER SUCCESS GET SET UP FOR REACT STRIPE ELEMENT?
  };

  // Frequency
  // - *** need to add support for selected by default for the amounts (one timePickerDefaultProps, monthly, yearly)
  //  - need to add support for each one being enabled or not (not just open ended)

  const ElementsContainer = liveView ? Elements : AltElementsContainer;

  return (
    <S.DonationPage data-testid="donation-page">
      <HeaderBar
        headerLogo={pageData.headerLogo}
        headerLink={pageData.headerLink}
        headerBgImage={pageData.headerBgImage}
      />
      <S.PageMain>
        <S.SideOuter>
          <S.SideInner>
            <PageHeading heading={pageData.heading} />
            <S.DonationContent>
              <Graphic graphic={pageData.graphic} />

              <ElementsContainer options={{ clientSecret: stripeClientSecret }} stripe={stripePromise}>
                <FormProvider {...methods}>
                  <ContributionForm
                    liveView={false}
                    loading={false}
                    onSubmit={methods.handleSubmit(onSubmit)}
                    submitButtonText={submitButtonText}
                    payFeesLabelText={payFeesLabelText}
                  >
                    {pageData.dynamicElements.map((Element, idx) => {
                      return <Element key={`donation-page-dynamic-form-element-${idx}`} {...globalFormContext} />;
                    })}
                  </ContributionForm>
                </FormProvider>
              </ElementsContainer>
              <DonationPageDisclaimer
                amount={totalPaymentAmount}
                currencySymbol={pageData.currencySymbol}
                frequency={watchedFrequencyValue}
              />
            </S.DonationContent>
          </S.SideInner>
        </S.SideOuter>
        <DonationPageSidebar sidebarContent={pageData?.sideBarElements} live={liveView} />
      </S.PageMain>
      <DonationPageFooter rpName={pageData.rpName} />
    </S.DonationPage>
  );
}

DonationPage.defaultProps = {
  liveView: false
};

DonationPage.propTypes = {
  defaultAmount: PropTypes.number,
  pageData: PropTypes.shape({}).isRequired,
  liveView: PropTypes.bool.isRequired,
  stripePromise: PropTypes.shape({
    then: PropTypes.func.isRequired,
    catch: PropTypes.func.isRequired
  }).isRequired,
  stripeClientSecret: PropTypes.string.isRequired
};
export default DonationPage;
