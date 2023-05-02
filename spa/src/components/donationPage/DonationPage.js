import { useRef, useState, useEffect, createContext, useContext } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useCookies } from 'react-cookie';
import { useAlert } from 'react-alert';

import * as S from './DonationPage.styled';
import axios from 'ajax/axios';
import useReCAPTCHAScript from 'hooks/useReCAPTCHAScript';
import useQueryString from 'hooks/useQueryString';
import useErrorFocus from 'hooks/useErrorFocus';
import useClearbit from 'hooks/useClearbit';
import * as getters from 'components/donationPage/pageGetters';
import { getDefaultAmountForFreq } from './amountUtils';
import { frequencySort } from 'components/donationPage/pageContent/DFrequency';
import {
  GRECAPTCHA_SITE_KEY,
  SALESFORCE_CAMPAIGN_ID_QUERYPARAM,
  FREQUENCY_QUERYPARAM,
  AMOUNT_QUERYPARAM,
  CSRF_HEADER
} from 'appSettings';
import DonationPageSidebar from 'components/donationPage/DonationPageSidebar';
import DonationPageFooter from 'components/donationPage/DonationPageFooter';
import StripePaymentWrapper from 'components/paymentProviders/stripe/StripePaymentWrapper';
import Modal from 'elements/modal/Modal';
import LiveErrorFallback from './live/LiveErrorFallback';
import { SubmitButton } from './DonationPage.styled';
import GenericErrorBoundary from 'components/errors/GenericErrorBoundary';
import { AUTHORIZE_STRIPE_PAYMENT_ROUTE } from 'ajax/endpoints';
import { serializeData } from 'components/paymentProviders/stripe/stripeFns';
import calculateStripeFee from 'utilities/calculateStripeFee';
import { CONTRIBUTION_INTERVALS } from 'constants/contributionIntervals';
import { GENERIC_ERROR } from 'constants/textConstants';

function authorizePayment(paymentData, csrftoken) {
  // we manually set the X-CSRFTOKEN value in header here. This is an unauthed endpoint
  // that on the backend requires csrf header, which will be in cookie returned by request
  // for page data (that happens in parent context)
  return axios
    .post(AUTHORIZE_STRIPE_PAYMENT_ROUTE, paymentData, { headers: { [CSRF_HEADER]: csrftoken } })
    .then(({ data }) => data);
}

function cancelPayment(paymentId, csrftoken) {
  const endpoint = `${AUTHORIZE_STRIPE_PAYMENT_ROUTE}${paymentId}/`;
  // we manually set the X-CSRFTOKEN value in header here. This is an unauthed endpoint
  // that on the backend requires csrf header, which will be in cookie returned by request
  // for page data (that happens in parent context)

  return axios.delete(endpoint, { headers: { [CSRF_HEADER]: csrftoken } }).then(({ data }) => data);
}

export const DonationPageContext = createContext({});

export const CANCEL_PAYMENT_FAILURE_MESSAGE =
  "Something went wrong, but don't worry, you haven't been charged. Try refreshing.";
class DonationPageUnrecoverableError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DonationPageUnrecoverableError';
  }
}

function DonationPage({ page, live = false }) {
  const alert = useAlert();
  const formRef = useRef();
  const salesforceCampaignId = useQueryString(SALESFORCE_CAMPAIGN_ID_QUERYPARAM);
  const freqQs = useQueryString(FREQUENCY_QUERYPARAM);
  const amountQs = useQueryString(AMOUNT_QUERYPARAM);
  const [frequency, setFrequency] = useState();
  const [amount, setAmount] = useState(0);
  const [feeAmount, setFeeAmount] = useState(0);
  const [userAgreesToPayFees, setUserAgreesToPayFees] = useState(() => {
    return (page?.elements?.find((el) => el.type === 'DPayment') || {})?.content?.payFeesDefault === true;
  });
  const [totalAmount, setTotalAmount] = useState(0);
  const [displayErrorFallback, setDisplayErrorFallback] = useState(false);
  const [stripeClientSecret, setStripeClientSecret] = useState();
  const [emailHash, setEmailHash] = useState();
  const [displayStripePaymentForm, setDisplayStripePaymentForm] = useState(false);
  const [contributorEmail, setContributorEmail] = useState();
  const [mailingCountry, setMailingCountry] = useState();
  const [stripeBillingDetails, setStripeBillingDetails] = useState();
  const [contributionUuid, setContributionUuid] = useState();

  const [cookies] = useCookies(['csrftoken']);

  // we use this on form submission to authorize a one-time payment or subscription. Note that the function
  // passed to `useMutation` must return a promise.
  const { mutate: createPayment, isLoading: createPaymentIsLoading } = useMutation((paymentData) =>
    authorizePayment(paymentData, cookies.csrftoken)
  );

  const { mutate: deletePayment } = useMutation((paymentId) => cancelPayment(paymentId, cookies.csrftoken), {
    onError: (err) => {
      // calling console.error will create a Sentry error.
      console.error(err);
      alert.error(CANCEL_PAYMENT_FAILURE_MESSAGE);
    }
  });

  /*
  If window.grecaptcha is defined-- which should be done in useReCAPTCHAScript hook--
  listen for readiness and resolve promise with resulting reCAPTCHA token.
  @returns {Promise} - resolves to token or error
  */
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
        // TODO: [DEV-2372] Make Google Recaptcha integration less brittle
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
    // when a user focuses on the custom amount field in the DAmount component,
    // the amount value is set to empty string initially. This is the only time
    // it should be able to have a non-numeric value. If there's already a feeAmount,
    // and amount changes to '', we want to update the fee amount, so we resolve to
    // 0. When the user enters a new numeric amount, fee still gets updated.
    const resolvedAmount = amount ?? 0;
    if (typeof resolvedAmount === 'number' && frequency && page?.revenue_program_is_nonprofit !== null) {
      setFeeAmount(calculateStripeFee(resolvedAmount, frequency, page.revenue_program_is_nonprofit));
    }
  }, [amount, frequency, page.revenue_program_is_nonprofit]);

  // update total amount based on amount, fee amount, and if user agrees to pay fees
  useEffect(() => {
    setTotalAmount(userAgreesToPayFees ? amount + feeAmount : amount);
  }, [amount, feeAmount, userAgreesToPayFees]);

  // Used for pre-submission validation below.
  const isValidTotalAmount = Number.isFinite(totalAmount);

  const getCheckoutData = async () => {
    let reCAPTCHAToken = '';
    // getReCAPTCHAToken returns rejected promise if window.grecaptcha is not defined when function runs.
    // In tests, and quite possibly in deployed environments, this causes form submission to fail if grecaptcha
    // hasn't loaded. We don't want tests to fail or users to be blocked from making a contribution just because
    // this script hasn't loaded, so if error occurs, we just go with default empty string value for token, and log.
    try {
      reCAPTCHAToken = await getReCAPTCHAToken();
    } catch (error) {
      console.error('No recaptcha token, defaulting to empty string');
    }
    return serializeData(formRef.current, {
      amount,
      frequency,
      mailingCountry,
      reCAPTCHAToken,
      pageId: page.id,
      payFee: userAgreesToPayFees,
      rpIsNonProfit: page.revenue_program_is_nonprofit,
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
        // stripe complains if any of the fields are missing, so we default to empty string
        city: data.mailing_city ?? '',
        country: data.mailing_country ?? '',
        line1: data.mailing_street ?? '',
        line2: data.mailing_complement ?? '',
        postal_code: data.mailing_postal_code ?? '',
        state: data.mailing_state ?? ''
      }
    });
    createPayment(data, {
      onSuccess: ({ client_secret, email_hash, uuid }) => {
        setStripeClientSecret(client_secret);
        setEmailHash(email_hash);
        setDisplayStripePaymentForm(true);
        setContributionUuid(uuid);
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
          // This happens if something really unexpected happens, or if there was a 403
          console.error('Something unexpected happened', name, message);
          setDisplayErrorFallback(true);
        }
      }
    });
  };

  function handleStripePaymentWrapperError() {
    setDisplayStripePaymentForm(false);
    alert.error(GENERIC_ERROR);
  }

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
        mailingCountry,
        setMailingCountry,
        contributionUuid,
        cancelPayment: () => {
          deletePayment(contributionUuid);
          setDisplayStripePaymentForm(false);
        }
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
                ) : (
                  <form onSubmit={handleCheckoutSubmit} ref={formRef}>
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
                    <SubmitButton
                      disabled={!isValidTotalAmount || createPaymentIsLoading}
                      loading={createPaymentIsLoading}
                      type="submit"
                    >
                      {isValidTotalAmount ? 'Continue to Payment' : 'Enter a valid amount'}
                    </SubmitButton>
                  </form>
                )}

                {displayStripePaymentForm && (
                  <Modal isOpen={displayStripePaymentForm}>
                    <StripePaymentWrapper onError={handleStripePaymentWrapperError} />
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
  once: CONTRIBUTION_INTERVALS.ONE_TIME,
  monthly: CONTRIBUTION_INTERVALS.MONTHLY,
  yearly: CONTRIBUTION_INTERVALS.ANNUAL
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
  if (!freqFromQs && amountQs) return CONTRIBUTION_INTERVALS.ONE_TIME;
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
  return CONTRIBUTION_INTERVALS.ONE_TIME;
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
