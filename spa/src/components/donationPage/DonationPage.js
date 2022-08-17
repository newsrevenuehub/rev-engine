import { FormProvider, useForm } from 'react-hook-form';
import { useEffect, useCallback, useState } from 'react';

import * as S from './DonationPage.styled';
// import useClearbit from 'hooks/useClearbit';
// import { getDefaultAmountForFreq } from 'components/donationPage/pageContent/DAmount';
import { frequencySort } from 'components/donationPage/elements/form/frequency';
// import { SALESFORCE_CAMPAIGN_ID_QUERYPARAM, FREQUENCY_QUERYPARAM, AMOUNT_QUERYPARAM } from 'settings';

import HeaderBar from './elements/headerBar/HeaderBar';
import Graphic from './elements/graphic/Graphic';
import PageHeading from './elements/pageHeading/PageHeading';
import Amount from './Amount';
import Frequency from './Frequency';
import PayFees from './PayFees';

import ContributionForm from './elements/form/Form';

import DonationPageSidebar from 'components/donationPage/elements/sidebar/DonationPageSidebar';
import DonationPageFooter from 'components/donationPage/elements/footer/Footer';

import validationSchema from './schema';
import { find } from 'draft-js/lib/DefaultDraftBlockRenderMap';

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

const getDataFromPage = (page) => {
  const {
    revenue_program_is_nonprofit: isNonprofit,
    styles,
    allow_offer_nyt_comp: allowOfferNytComp,
    elements: dynamicElements
  } = page;

  const currencySymbol = page?.currency?.symbol;
  const frequencyOptions = page?.elements?.find(({ type }) => type === 'DFrequency')?.content || [];
  const amountConfig = page?.elements?.find(({ type }) => type === 'DAmount')?.content || {};
  const { allowOther: allowOtherAmount, options: amountOptions } = amountConfig;
  const { askPhone } = page?.elements?.find(({ type }) => type === 'DDonorInfo')?.content || {};
  const reasonConfig = page?.elements?.find(({ type }) => type === 'DReason')?.content || {};
  const { reasons: reasonOptions, askReason, askHonoree, askInMemoryOf } = reasonConfig;
  const swagOptions = page?.elements?.find(({ type }) => type === 'DSwag')?.content || {};
  const { optOutDefault, swagThreshold, swags } = { swagOptions };
  const paymentConfig = page?.elements?.find(({ type }) => type === 'DPayment')?.content || {};
  const { offerPayFees, stripe: wallets } = paymentConfig;

  return {
    currencySymbol,
    isNonprofit,
    styles,
    allowOfferNytComp,
    frequencyOptions,
    allowOtherAmount,
    amountOptions,
    askPhone,
    reasonOptions,
    askReason,
    askHonoree,
    askInMemoryOf,
    optOutDefault,
    swagThreshold,
    swags,
    offerPayFees,
    wallets,
    dynamicElements
  };
};

function DonationPage({ page, liveView = false }) {
  const pageData = getDataFromPage(page);
  const resolver = useYupValidationresolver(validationSchema);
  const methods = useForm({ resolver });

  const [swagThresholdMet, setswagThresholdMet] = useState(false);

  // totalPaymentAmount is distinct from the amount the user has
  // chosen in the form. It's that amount plus fees if they agree.
  // It's this derived value that will get submitted to Stripe.
  const [totalPaymentAmount, setTotalPaymentAmount] = useState([]);

  // orchestration of these fields happens in the RHF layer, where
  // different inputs are initiated by a watchable name.
  // We use RHF's built in watch functionality to update thet "global"
  // state values for amount, frequency, and agreePayFees, which are required
  // and set by constituent form parts, each registered with RHF in situ.
  const watchedAmountFormValue = methods.watch(Amount.defaultProps.name);
  const watchedFrequencyValue = methods.watch(Frequency.defaultProps.name);
  const watchedAgreePayFees = methods.watch(PayFees.defaultProps.name);

  // this changes based on current chosen frequency
  const [availableAmounts, setAvailableAmounts] = useState([]);
  const [submitButtonText, setSubmitButtonText] = useState('');

  useEffect(() => {
    setswagThresholdMet(watchedAmountFormValue >= pageData.swagThreshold);
  }, [watchedAmountFormValue, pageData.swagThreshold]);

  // filter page level dynamic elements. specifically, filtering out
  // X if Y.
  useEffect(() => {
    setDynamicElements(() => {
      (page?.dynamic_elements || []).filter(({ name: elementName }) => {
        return (
          elementName && (elementName !== 'foo' || (elementName === PayFees.defaultProps.name && swagThresholdMet))
        );
      });
    });
  }, [page.dynamic_elements, swagThresholdMet]);

  useEffect(() => {
    if (page?.frequency?.content?.length !== null && page?.amounts) {
      setAvailableAmounts(page.amounts);
    }
  }, [page?.amounts, page?.frequency?.content?.length]);

  useEffect(() => {
    if (page?.amounts !== null && watchedFrequencyValue !== null) {
      setAvailableAmounts(page?.amounts.find(watchedFrequencyValue));
    }
  }, [watchedFrequencyValue, page?.amounts]);

  // for submitButtonText
  const chosenFreqLabel = null;
  // e.g., once, per year, etc.
  useEffect(() => {
    setSubmitButtonText(
      `Give ${currencySymbol ? currencySymbol + ' ' : ''}${watchedFormValue ? watchedFormValue + ' ' : ''}${
        chosenFreqLabel || ''
      }}`
    );
  }, [watchedAmountFormValue, watchedFrequencyValue]);

  // useEffect on stripe secret
  const onSubmit = () => {
    // try submitting to stripe
    // submit to server with rest (or is that all metadata???)
    // stripe submission may reveal form errors in which case display
    // same with other fields
    // errors get fed back into form.
  };

  const globalFormContext = {
    currencySymbol, // from page, required by disclaimer, amount
    amount: watchedAmountFormValue, // from form - required by disclaimer -- number
    frequency: watchedFrequencyValue, // from form -- needed by Amount, Disclaimer
    presetAmounts: [], // server (these are per interval and come from page) -- Needed by Amount
    allowUserSetValue: true, // from server - Amount
    defaultAmount: undefined, // get from query params if there
    frequencyOptions: [], // get from page
    // default checked index for frequency?
    reasonPromptRequired: true, // from page
    reasonPromptOptions: [], // from page
    inHonorDisplay: true, // from page
    inMemoryDisplay: true, // from page
    swagThresholdAmount: null, //,  from page
    optOutDefaultChecked: false,
    swagItemLabelText: '',
    swagItemOptions: [],
    swagThresholdMet: swagThresholdMet,
    agreePayFees: watchedAgreePayFees,
    dynamicElements,
    onSubmit,
    isLive,
    submitButtonText,
    availableWallets
    // WHERE DOES NEXT PAGE AFTER SUCCESS GET SET UP FOR REACT STRIPE ELEMENT?
  };

  // Amount -- needs
  // - chosen frequency (form - amountFrequency)
  // - amount options (page - presetAmounts)
  // - allowUserSetValued (page)
  // - currency symbol (page - amountCurrencySymbol)
  //
  //
  // page editor:
  // needs to know / set
  // - page one time amounts
  // - page monthly amounts
  // - page yearly amounts
  // - page include other option

  // Reason for giving
  // - inHonorDisplay (page)
  // - inMemoryDisplay (page)

  // Frequency
  // - *** need to add support for selected by default for the amounts (one timePickerDefaultProps, monthly, yearly)
  //  - need to add support for each one being enabled or not (not just open ended)
  //

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
      <HeaderBar page={page} />
      <S.PageMain>
        <S.SideOuter>
          <S.SideInner>
            <PageHeading heading={page.heading} />
            <S.DonationContent>
              <Graphic graphic={page.graphic} />
              <FormProvider {...methods}>
                <ContributionForm {...globalFormContext} />
              </FormProvider>
            </S.DonationContent>
          </S.SideInner>
        </S.SideOuter>
        <DonationPageSidebar sidebarContent={page?.sidebar_elements} live={liveView} />
      </S.PageMain>
      <DonationPageFooter page={page} />
    </S.DonationPage>
  );
}

export default DonationPage;

// Keys are the strings expected as querys params, values are our version.
const mapQSFreqToProperFreq = {
  once: 'one_time',
  monthly: 'month',
  yearly: 'year'
};

/**
 * getInitialFrequency
 * @param {object} page - page object
 * @param {string} freqQs - frequency query string
 * @param {string} amountQs - amount query string
 */
export function getInitialFrequency(page, freqQs, amountQs) {
  // First, respond to qs if present.
  // If there's a freqQs, it's simple, just set frequency to that qs
  const freqFromQs = mapQSFreqToProperFreq[freqQs];
  if (freqFromQs) return freqFromQs;
  // If there's an amountQs, but no freqQs, we want to show that amount as "one-time"
  if (!freqFromQs && amountQs) return 'one_time';
  // Otherwise, if there's no freq or amount QS, set default normally, which means...
  const frequencyElement = page?.elements?.find((el) => el.type === 'DFrequency');
  if (frequencyElement?.content) {
    // If there's a default frequency, use it...
    const defaultFreq = frequencyElement.content?.find((freq) => freq.isDefault);
    if (defaultFreq) return defaultFreq.value;

    // ...otherwise, use the "first" in the list.
    const content = frequencyElement.content || [];
    const sortedOptions = content.sort(frequencySort);
    return sortedOptions[0]?.value || '';
  }
  // Or, if for some reason non of these conditions are met, just return one_time
  return 'one_time';
}

/**
 * getInitialAmount
 * @param {string} frequency - The frequency to get the default for
 * @param {object} page - page object
 * @param {string} amountQs - amount query string
 */
export function getInitialAmount(frequency, page, amountQs, setOverrideAmount) {
  // If there's an amountQs, set it.
  if (amountQs) {
    const amountElement = page?.elements?.find((el) => el.type === 'DAmount');
    const amounts = (amountElement?.content?.options && amountElement.content.options[frequency]) || [];
    const amountIsPreset = amounts.map((a) => parseFloat(a)).includes(parseFloat(amountQs));
    // If amountQs isn't in this freqs amounts, set override
    if (!amountIsPreset) {
      setOverrideAmount(true);
    }
    return parseFloat(amountQs);
  } else {
    const defaultAmountForFreq = null;
    // const defaultAmountForFreq = getDefaultAmountForFreq(frequency, page);
    return defaultAmountForFreq;
  }
}
