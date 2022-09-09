import { useRef, useState, useEffect, createContext, useContext } from 'react';
import { useMutation } from 'react-query';

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
import StripePaymentWrapper from 'components/paymentProviders/stripe/StripePaymentWrapper';
import Spinner from 'elements/Spinner';
import Modal from 'elements/modal/Modal';
import LiveErrorFallback from './live/LiveErrorFallback';
import { SubmitButton } from './DonationPage.styled';
import GenericErrorBoundary from 'components/errors/GenericErrorBoundary';
import { AUTHORIZE_ONE_TIME_STRIPE_PAYMENT_ROUTE, AUTHORIZE_STRIPE_SUBSCRIPTION_ROUTE } from 'ajax/endpoints';
import { serializeData } from 'components/paymentProviders/stripe/stripeFns';
import calculateStripeFee from 'utilities/calculateStripeFee';
import formatStringAmountForDisplay from 'utilities/formatStringAmountForDisplay';
import { getFrequencyAdverb } from 'utilities/parseFrequency';

import { CSRF_HEADER } from 'settings';

// https://stackoverflow.com/a/49224652
function getCookie(name) {
  let cookie = {};
  document.cookie.split(';').forEach(function (el) {
    let [k, v] = el.split('=');
    cookie[k.trim()] = v;
  });
  return cookie[name];
}

function authorizePayment(paymentData, paymentType) {
  const apiEndpoint =
    paymentType === 'one_time' ? AUTHORIZE_ONE_TIME_STRIPE_PAYMENT_ROUTE : AUTHORIZE_STRIPE_SUBSCRIPTION_ROUTE;
  // we manually set the XCSRFToken value in header here. This is an unauthed endpoint
  // that on the backend requires csrf header, which will be in cookie returned by request
  // for page data (that happens in parent context)
  return axios
    .post(apiEndpoint, { ...paymentData }, { headers: { [CSRF_HEADER]: getCookie('csrftoken') } })
    .then(({ data }) => data);
}

const DonationPageContext = createContext({});

class DonationPageUnrecoverableError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DonationPageUnrecoverableError';
  }
}

function DonationPage({ page, live = false }) {
  const formRef = useRef();
  const salesforceCampaignId = useQueryString(SALESFORCE_CAMPAIGN_ID_QUERYPARAM);
  const freqQs = useQueryString(FREQUENCY_QUERYPARAM);
  const amountQs = useQueryString(AMOUNT_QUERYPARAM);
  const [frequency, setFrequency] = useState();
  const [amount, setAmount] = useState(0);
  const [feeAmount, setFeeAmount] = useState(0);
  const [userAgreesToPayFees, setUserAgreesToPayFees] = useState(() => {
    return (page?.elements?.find((el) => el.type === 'DPayment') || {})?.content?.offerPayFees === true;
  });
  const [totalAmount, setTotalAmount] = useState(0);
  const [displayErrorFallback, setDisplayErrorFallback] = useState(false);
  const [stripeClientSecret, setStripeClientSecret] = useState();
  const [emailHash, setEmailHash] = useState();
  const [displayStripePaymentForm, setDisplayStripePaymentForm] = useState(false);
  const [contributorEmail, setContributorEmail] = useState();
  const [mailingCountry, setMailingCountry] = useState();

  const [stripeBillingDetails, setStripeBillingDetails] = useState();

  // we use this on form submission to authorize a one-time payment or subscription. Note that the function
  // passed to `useMutation` must return a promise.
  const { mutate: createPayment, isLoading: createPaymentIsLoading } = useMutation((paymentData) => {
    switch (paymentData.interval) {
      case 'one_time':
        return authorizePayment(paymentData, 'one_time');
      case 'month':
      case 'year':
        return authorizePayment(paymentData, paymentData.interval);
      default:
        return Promise.reject(new DonationPageUnrecoverableError('Unexpected payment interval in paymentData'));
    }
  });

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

  // update the fee amount as amount and frequency change
  useEffect(() => {
    if (typeof amount === 'number' && frequency && page?.revenue_program_is_nonprofit !== null) {
      setFeeAmount(calculateStripeFee(amount, frequency, page.revenue_program_is_nonprofit));
    }
  }, [amount, frequency, page.revenue_program_is_nonprofit]);

  // update total amount based on amount, fee amount, and if user agrees to pay fees
  useEffect(() => {
    setTotalAmount(userAgreesToPayFees ? amount + feeAmount : amount);
  }, [amount, feeAmount, userAgreesToPayFees]);

  const getCheckoutData = async () => {
    const reCAPTCHAToken = await getReCAPTCHAToken();
    return serializeData(formRef.current, {
      mailing_country: mailingCountry,
      amount: totalAmount,
      frequency,
      reCAPTCHAToken,
      pageId: page.id,
      salesforceCampaignId
    });
  };

  const handleCheckoutSubmit = async (e) => {
    e.preventDefault();
    const data = await getCheckoutData();
    // we grab form data and set it different state objects, some of which in turn gets
    // passed in donation page context, so will be available in usePage, when `StripePaymentForm` loads.
    // ideally, we'd use a library like React Hook Form for and we could watch the relevant form fields
    // and pass along to context that way, but that was not feasible in short term.
    setContributorEmail(data.email);
    setStripeBillingDetails({
      name: `${data.first_name}${data.first_name ? ' ' : ''}${data.last_name}`,
      email: data.email,
      phone: data.phone || '', // stripe will complain if its null or undefined, and it's an optional field
      address: {
        city: data.mailing_city,
        country: data.mailing_country,
        line1: data.mailing_street,
        line2: '', // stripe complains if this is missing
        postal_code: data.mailing_postal_code,
        state: data.mailing_state
      }
    });
    createPayment(data, {
      onSuccess: ({ provider_client_secret_id, email_hash }) => {
        setStripeClientSecret(provider_client_secret_id);
        setEmailHash(email_hash);
        setDisplayStripePaymentForm(true);
      },
      onError: ({ name, message, response }) => {
        // this would happen on client side if request couldn't be made. See above.
        if (name === DonationPageUnrecoverableError.name) {
          console.error(message);
          setDisplayErrorFallback(true);
          // This would happen if the server returned validation errors on the form
        } else if (response?.status === 400 && response?.data) {
          setErrors(response.data);
        } else {
          console.error('Something unexpected happened', name, message);
          setDisplayErrorFallback(true);
        }
      }
    });
  };

  const getCheckoutSubmitButtonText = (currencySymbol, totalAmount, frequency) => {
    if (isNaN(totalAmount)) return 'Enter a valid amount';
    return `Give ${currencySymbol}${formatStringAmountForDisplay(totalAmount)} ${getFrequencyAdverb(frequency)}`;
  };

  const [paymentSubmitButtonText, setPaymentSubmitButtonText] = useState();

  useEffect(() => {
    if (page?.currency?.symbol && !isNaN(totalAmount) && frequency) {
      setPaymentSubmitButtonText(
        `Give ${page.currency.symbol}${formatStringAmountForDisplay(totalAmount)} ${getFrequencyAdverb(frequency)}`
      );
    }
  }, [frequency, page.currency?.symbol, totalAmount]);

  return (
    <DonationPageContext.Provider
      value={{
        page,
        frequency,
        setFrequency,
        userAgreesToPayFees,
        setUserAgreesToPayFees,
        formRef,
        amount,
        setAmount,
        overrideAmount,
        setOverrideAmount,
        errors,
        setErrors,
        feeAmount,
        totalAmount,
        emailHash,
        stripeBillingDetails,
        contributorEmail,
        stripeClientSecret,
        setMailingCountry,
        paymentSubmitButtonText
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
                {displayErrorFallback ? (
                  <LiveErrorFallback />
                ) : createPaymentIsLoading ? (
                  <Spinner />
                ) : (
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
                        .map((element, idx) => (
                          <GenericErrorBoundary key={idx}>
                            {getters.getDynamicElement(element, live)}
                          </GenericErrorBoundary>
                        ))}
                    </S.PageElements>
                    <SubmitButton disabled={createPaymentIsLoading} type="submit">
                      {getCheckoutSubmitButtonText(page?.currency?.symbol, totalAmount, frequency)}
                    </SubmitButton>
                  </form>
                )}

                {displayStripePaymentForm && (
                  <Modal isOpen={displayStripePaymentForm}>
                    <StripePaymentWrapper />
                  </Modal>
                )}
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
