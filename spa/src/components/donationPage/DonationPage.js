import { useRef, useState, useEffect, createContext, useContext } from 'react';
import { useMutation } from '@tanstack/react-query';

import * as S from './DonationPage.styled';
import axios from 'ajax/axios';
import useReCAPTCHAScript from 'hooks/useReCAPTCHAScript';
import useQueryString from 'hooks/useQueryString';
import useErrorFocus from 'hooks/useErrorFocus';
import useClearbit from 'hooks/useClearbit';
import * as getters from 'components/donationPage/pageGetters';
import { getDefaultAmountForFreq } from 'components/donationPage/pageContent/DAmount';
import { frequencySort } from 'components/donationPage/pageContent/DFrequency';
import {
  GRECAPTCHA_SITE_KEY,
  SALESFORCE_CAMPAIGN_ID_QUERYPARAM,
  FREQUENCY_QUERYPARAM,
  AMOUNT_QUERYPARAM
} from 'settings';
import DonationPageSidebar from 'components/donationPage/DonationPageSidebar';
import DonationPageFooter from 'components/donationPage/DonationPageFooter';
import GenericErrorBoundary from 'components/errors/GenericErrorBoundary';
import { AUTHORIZE_ONE_TIME_STRIPE_PAYMENT_ROUTE, AUTHORIZE_STRIPE_SUBSCRIPTION_ROUTE } from 'ajax/endpoints';
import { serializeData } from 'components/paymentProviders/stripe/stripeFns';

function authorizePayment(paymentData, paymentType) {
  const apiEndpoint =
    paymentType === 'one_time' ? AUTHORIZE_ONE_TIME_STRIPE_PAYMENT_ROUTE : AUTHORIZE_STRIPE_SUBSCRIPTION_ROUTE;
  return axios.post(apiEndpoint, { ...paymentData });
}

const DonationPageContext = createContext({});

function DonationPage({ page, live = false }) {
  const formRef = useRef();

  const salesForceQS = useQueryString(SALESFORCE_CAMPAIGN_ID_QUERYPARAM);
  const freqQs = useQueryString(FREQUENCY_QUERYPARAM);
  const amountQs = useQueryString(AMOUNT_QUERYPARAM);
  const [frequency, setFrequency] = useState();
  const [amount, setAmount] = useState();
  const [payFee, setPayFee] = useState(() => getInitialPayFees(page));

  // we use these on form submission to authorize a one-time payment or subscription
  const authorizeOneTimePayment = useMutation((paymentData) => authorizePayment(paymentData, 'one_time'));
  const authorizeSubscription = useMutation((paymentData) => authorizePayment(paymentData, 'subscription'));

  // **
  //  * If window.grecaptcha is defined-- which should be done in useReCAPTCHAScript hook--
  //  * listen for readiness and resolve promise with resulting reCAPTCHA token.
  //  * @returns {Promise} - resolves to token or error
  //  */
  const getReCAPTCHAToken = () =>
    new Promise((resolve, reject) => {
      if (window.grecaptcha) {
        window.grecaptcha.ready(async function () {
          try {
            const token = window.grecaptcha.execute(GRECAPTCHA_SITE_KEY, { action: 'submit' });
            resolve(token);
          } catch (error) {
            reject(error);
          }
        });
      } else {
        reject(new Error('window.grecaptcha not defined at getReCAPTCHAToken call time'));
      }
    });

  useReCAPTCHAScript();

  // overrideAmount causes only the custom amount to show (initially)
  const [overrideAmount, setOverrideAmount] = useState(false);
  const [errors, setErrors] = useState({});
  const [salesforceCampaignId, setSalesforceCampaignId] = useState();

  // Focus the first input on the page that has an error
  useErrorFocus(formRef, errors);

  // initialize clearbit.js
  useClearbit(live);

  useEffect(() => {
    setFrequency(getInitialFrequency(page, freqQs, amountQs));
  }, [freqQs, amountQs, page]);

  useEffect(() => {
    const freq = getInitialFrequency(page, freqQs, amountQs);
    setAmount(getInitialAmount(freq, page, amountQs, setOverrideAmount));
  }, [amountQs, setOverrideAmount, freqQs, page]);

  // Set sf_campaign_id from queryparams
  useEffect(() => {
    if (salesForceQS) setSalesforceCampaignId(salesForceQS);
  }, [salesForceQS, setSalesforceCampaignId]);

  const getData = async () => {
    const reCAPTCHAToken = await getReCAPTCHAToken();
    return serializeData(formRef.current, {
      amount,
      frequency,
      reCAPTCHAToken
    });
  };

  // UPNEXT: THis is what value was on submission.

  //   {
  //     "first_name": "adf",
  //     "last_name": "af",
  //     "email": "ben@foo.com",
  //     "phone": "adfklj",
  //     "amount": "123",
  //     "interval": "one_time",
  //     "mailing_street": "123 Melrose Street",
  //     "mailing_city": "Nadsjf",
  //     "mailing_state": "New York",
  //     "mailing_postal_code": "11206",
  //     "mailing_country": "United States",
  //     "reason_other": "adf",
  //     "tribute_type": "",
  //     "donor_selected_amount": "123",
  //     "captcha_token": "HFamlveRBLOig4NFlaRENLRQhkHXopaiASBSoiE28SOD8OKGMDGkt-LW5TdjNPKS4uKmN5DhocQ1xfIwlqXw8lZxUvVEQ3T2d4Qnw5TQV8O2o_VmcwSGo3bWkkS0lMSBkcHX5JM3AJIWMFKCEQfhJLYF5xM1RILm5cOVJ0L1FWcXtnNxkdb2pLRQhkGTN6WmV7XXp6QH0VTFBfcyVDDTptejFcajMGP1h-aj8UXEBHX00OYRltLkxiT1R3fVMsTWptW2o6DUR8OTloDnAxSWF_PD8TXhkcGBtcC2IcPXBDZ0xCPSJkahI-IQMpO05Zbi9sPlcjb2FkcHR-OhkcHUVPQkE_QThEWmVWVn5jAGtiTFRxP2Nkemc6e3kPNTJCZXB1YTZlWFxcTk1fdh8dWnlRBAJfQEk_Ry4zBHQ2SkdnMHsFW2ktXyopXVg_UEdaQ11FWzRDeS8af0NfdHhOPH9-cFBrNwUeTwl7MlJqeRdLUXtuJxkcHUVPQkE_QThEWX5XR3p7ejtJbGISKRUQGjBrL24YMWlObXVwZj9ddEtBXkZfIVV8LW5eT1R0cwNsFXlkU2o4TXRhKnQ_SiVqYj4oPD5hS1pHSV1aSw9eJW1JNxFyPSMSfhJOIQMtYXR3bAdTMFwrCVZoWV58YQ1YaBxiEn8JCm0pDCRg"
  // }

  const handleCheckoutSubmit = async (e) => {
    e.preventDefault();
    const data = await getData();
    debugger;
  };

  const handleProcessPaymentSubmit = (e) => {
    debugger;

    // 1. if total amount has changed because agree pay fees, need to update this on server
    //  for subscription: https://stripe.com/docs/api/subscriptions/update
    //  for one-time: https://stripe.com/docs/api/payment_intents/update
    // 2. call stripe.confirmPayment
    // 3. If errrors, show

    // const { error } = await stripe.confirmPayment({
    //   elements,
    //   confirmParams: {
    //     // Make sure to change this to your payment completion page
    //     return_url: "http://localhost:3000",
    //   },
    // });

    // // This point will only be reached if there is an immediate error when
    // // confirming the payment. Otherwise, your customer will be redirected to
    // // your `return_url`. For some payment methods like iDEAL, your customer will
    // // be redirected to an intermediate site first to authorize the payment, then
    // // redirected to the `return_url`.
    // if (error.type === "card_error" || error.type === "validation_error") {
    //   setMessage(error.message);
    // } else {
    //   setMessage("An unexpected error occurred.");
    // }
  };

  const handleProcessPaymentSubmitBack = () => {
    //  need to handle if they go back to first page
  };

  return (
    <DonationPageContext.Provider
      value={{
        page,
        frequency,
        setFrequency,
        payFee,
        setPayFee,
        formRef,
        amount,
        setAmount,
        overrideAmount,
        setOverrideAmount,
        errors,
        setErrors,
        salesforceCampaignId
        // stripeClientSecret
      }}
    >
      <S.DonationPage data-testid="donation-page">
        {getters.getHeaderBarElement()}
        <S.PageMain>
          <S.SideOuter>
            <S.SideInner>
              {getters.getPageHeadingElement()}
              <S.DonationContent>
                {getters.getGraphicElement()}
                <form onSubmit={(e) => handleCheckoutSubmit(e)} ref={formRef} data-testid="donation-page-form">
                  <S.PageElements>
                    {(!live && !page?.elements) ||
                      (page?.elements?.length === 0 && (
                        <S.NoElements>Open the edit interface to start adding content</S.NoElements>
                      ))}
                    {page?.elements
                      // The DPayment element in page data has some data we need to configure subsequent form
                      // user encounters after this form is submitted, so we filter out here.
                      ?.filter((element) => element.type !== 'DPayment')
                      .map((element) => (
                        <GenericErrorBoundary>{getters.getDynamicElement(element, live)}</GenericErrorBoundary>
                      ))}
                  </S.PageElements>
                  {/* this is temporary */}
                  <button type="submit">Submit it</button>
                </form>
                {/* DPayment modal goes here */}
              </S.DonationContent>
            </S.SideInner>
          </S.SideOuter>
          <DonationPageSidebar sidebarContent={page?.sidebar_elements} live={live} />
        </S.PageMain>
        <DonationPageFooter page={page} />
      </S.DonationPage>
    </DonationPageContext.Provider>
  );
}

export const usePage = () => useContext(DonationPageContext);

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
    const defaultAmountForFreq = getDefaultAmountForFreq(frequency, page);
    return defaultAmountForFreq;
  }
}

function getInitialPayFees(page) {
  const paymentElement = page?.elements?.find((el) => el.type === 'DPayment');
  const payFeesDefault = paymentElement?.content?.payFeesDefault;
  // If payFeesDefault is true or false...
  if (payFeesDefault === true || payFeesDefault === false) {
    // ...initial value should be payFeesDefault...
    return payFeesDefault;
  }
  // ...else, default to false
  return false;
}
